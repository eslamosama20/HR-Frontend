import { Component, computed, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DataViewModule } from 'primeng/dataview';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { RestaurantModeService } from 'src/app/services/cashier/restaurant-mode.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { isPharmacyStore } from 'src/app/models/inventory/storeDetails.model';
import { OrderType } from 'src/app/models/cashier/restaurant-mode.model';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import { formatDateToString } from 'src/app/utils/dateUtils';
import { SallaIntegrationService } from 'src/app/services/cashier/salla-integration.service';
import { CashierSession } from 'src/app/models/cashier/cashier-session.model';
import { CartItem, PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';
import { CashierProduct } from 'src/app/models/cashier/cashier-product.model';
import { AuthService } from 'src/app/modules/auth';
import { CashDrawerService } from 'src/app/services/cashier/cash-drawer.service';
import {
  CashierReceiptData,
  CashierReceiptTemplateId,
  CashierReceiptTemplateService
} from 'src/app/services/cashier/cashier-receipt-template.service';
import { CashierReceiptTemplatePreviewComponent } from '../shared/cashier-receipt-template-preview/cashier-receipt-template-preview.component';
import { environment } from 'src/environments/environment';
import { PharmacyPickupService } from 'src/app/services/cashier/pharmacy-pickup.service';
import { PharmacySupportApiService } from 'src/app/services/cashier/pharmacy-support-api.service';
import { ZidOrdersService } from 'src/app/services/cashier/zid-orders.service';
import { ReadyPrescriptionDto } from 'src/app/models/cashier/pharmacy-prescription-pos.model';
import {
  CashierHeldOrder,
  CashierHeldOrderRequest
} from 'src/app/models/cashier/held-order.model';
import {
  getCartPatientShareTotal,
  getSinglePharmacyPickupIdForCheckout,
  getSinglePharmacyPrescriptionIdForPayment
} from 'src/app/adapters/cashier/cashier-insurance-payment.adapter';
import { RootSalesClassService } from 'src/app/services/sales-classes-tree/root-sales-class.service';
import { RootSalesClassModel } from 'src/app/models/sales-classes-tree/rootSalesClass.model';
import { RootPurchaseClassService } from 'src/app/services/purchase-classes-tree/root-purchase-class.service';
import { RootPurchaseClassModel } from 'src/app/models/purchase-classes-tree/rootPurchaseClass.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { mapError } from 'src/app/shared/utils/runtime-error.util';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    DataViewModule,
    CardModule,
    TableModule,
    DialogModule,
    ConfirmDialogModule,
    InputNumberModule,
    ToastModule,
    CheckboxModule,
    RadioButtonModule,
    TooltipModule,
    DropdownModule,
    MultiSelectModule,
    AutoCompleteModule,
    CashierReceiptTemplatePreviewComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pos-dashboard.component.html',
  styleUrls: ['./pos-dashboard.component.scss']
})
export class PosDashboardComponent implements OnInit {
  private readonly showImagesStorageKey = 'cashier.pos.showProductImages';
  private readonly favoriteProductsStorageKey = 'cashier.pos.favoriteProducts';
  private readonly productImageCatalog: string[] = [
    'assets/media/cashier-products/laptop.jpg',
    'assets/media/cashier-products/mouse.jpg',
    'assets/media/cashier-products/keyboard.jpg',
    'assets/media/cashier-products/monitor.jpg',
    'assets/media/cashier-products/headphones.jpg',
    'assets/media/cashier-products/printer.jpg',
    'assets/media/cashier-products/usb.jpg',
    'assets/media/cashier-products/storage.jpg',
    'assets/media/cashier-products/accessories.jpg'
  ];
  private readonly supplementalProducts: CashierProduct[] = [
    {
      id: 9001,
      code: 'SUPP-001',
      barcode: '990000000001',
      nameAr: 'قارئ بطاقات ذكي',
      nameEn: 'Smart Card Reader',
      sellingPrice: 260.00,
      costPrice: 210.00,
      availableQuantity: 12,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'نقاط البيع',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/accessories.jpg'
    },
    {
      id: 9002,
      code: 'SUPP-002',
      barcode: '990000000002',
      nameAr: 'كيبورد أرقام POS',
      nameEn: 'POS Numeric Keyboard',
      sellingPrice: 175.00,
      costPrice: 130.00,
      availableQuantity: 16,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'نقاط البيع',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/keyboard.jpg'
    },
    {
      id: 9003,
      code: 'SUPP-003',
      barcode: '990000000003',
      nameAr: 'ستاند تابلت كاشير',
      nameEn: 'Cashier Tablet Stand',
      sellingPrice: 145.00,
      costPrice: 95.00,
      availableQuantity: 20,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'نقاط البيع',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/accessories.jpg'
    },
    {
      id: 9004,
      code: 'SUPP-004',
      barcode: '990000000004',
      nameAr: 'شاشة عميل صغيرة',
      nameEn: 'Customer Display Screen',
      sellingPrice: 590.00,
      costPrice: 460.00,
      availableQuantity: 9,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'نقاط البيع',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/monitor.jpg'
    },
    {
      id: 9005,
      code: 'SUPP-005',
      barcode: '990000000005',
      nameAr: 'هاند فري كاشير',
      nameEn: 'Cashier Headset',
      sellingPrice: 155.00,
      costPrice: 115.00,
      availableQuantity: 28,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'ملحقات',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/headphones.jpg'
    },
    {
      id: 9006,
      code: 'SUPP-006',
      barcode: '990000000006',
      nameAr: 'فأرة ألعاب سلكية',
      nameEn: 'Wired Gaming Mouse',
      sellingPrice: 120.00,
      costPrice: 82.00,
      availableQuantity: 34,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'ملحقات',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/mouse.jpg'
    },
    {
      id: 9007,
      code: 'SUPP-007',
      barcode: '990000000007',
      nameAr: 'قرص SSD سعة 1TB',
      nameEn: 'SSD 1TB',
      sellingPrice: 520.00,
      costPrice: 410.00,
      availableQuantity: 14,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'تخزين',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/storage.jpg'
    },
    {
      id: 9008,
      code: 'SUPP-008',
      barcode: '990000000008',
      nameAr: 'USB 128GB',
      nameEn: 'USB 128GB',
      sellingPrice: 79.00,
      costPrice: 52.00,
      availableQuantity: 55,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'تخزين',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/usb.jpg'
    },
    {
      id: 9009,
      code: 'SUPP-009',
      barcode: '990000000009',
      nameAr: 'طابعة إيصالات احتياطية',
      nameEn: 'Backup Receipt Printer',
      sellingPrice: 780.00,
      costPrice: 610.00,
      availableQuantity: 6,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'نقاط البيع',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/printer.jpg'
    },
    {
      id: 9010,
      code: 'SUPP-010',
      barcode: '990000000010',
      nameAr: 'لابتوب كاشير',
      nameEn: 'Cashier Laptop',
      sellingPrice: 2890.00,
      costPrice: 2340.00,
      availableQuantity: 8,
      taxPercentage: 15,
      includesTax: false,
      categoryNameAr: 'إلكترونيات',
      isActive: true,
      unitName: 'قطعة',
      image: 'assets/media/cashier-products/laptop.jpg'
    }
  ];

  // Signals for reactivity
  loading = signal<boolean>(false);
  checkoutLoading = signal<boolean>(false);
  currentSession = signal<CashierSession | null>(null);
  products = signal<CashierProduct[]>([]);
  cart = signal<CartItem[]>([]);
  showProductImages = signal<boolean>(true);
  viewMode = signal<'grid' | 'list'>('grid');
  canManageFavorites = signal<boolean>(false);
  favoriteProductIds = signal<number[]>([]);
  canViewRetailPrice = signal<boolean>(true);
  canViewWholesalePrice = signal<boolean>(true);
  canViewBulkPrice = signal<boolean>(true);
  canViewPurchasePrice = signal<boolean>(true);
  canAccessSupermarketMode = signal<boolean>(true);
  canAccessPharmacyMode = signal<boolean>(true);
  canAccessRestaurantMode = signal<boolean>(true);
  canApplyDiscount = signal<boolean>(true);
  canEditPrice = signal<boolean>(true);
  pricingMode = signal<'retail' | 'wholesale' | 'bulk' | 'purchase'>(
    (localStorage.getItem('pos_pricing_mode') as 'retail' | 'wholesale' | 'bulk' | 'purchase') || 'retail'
  );
  sallaPendingCount = signal<number>(0);
  zidPendingCount = signal<number>(0);

  /** Dual Mode: false = Normal Retail, true = Pharmacy (no manual qty, shows batch) */
  isPharmacyMode = false;
  checkoutIdempotencyKey: string | null = null;

  /** Feature flag — gates ready-prescription pickup panel & POS pharmacy shortcuts */
  readonly enablePharmacyMode = environment.enablePharmacyMode === true;
  readonly enablePrescriptionCheckout = (environment as any).enablePrescriptionCheckout === true;

  /** Left catalog: retail products vs ready prescriptions (when feature flag on) */
  catalogPane: 'products' | 'readyRx' = 'products';
  readyPrescriptions = signal<ReadyPrescriptionDto[]>([]);
  readyRxLoading = signal(false);
  readyRxError = signal<string | null>(null);
  checkoutRxLoading = signal(false);

  // Search & Filter
  searchTerm: string = '';

  // Cart Totals
  cartSubtotal = signal<number>(0);
  cartDiscount = signal<number>(0);
  cartTotalAfterDiscount = computed(() => Math.max(0, this.cartSubtotal() - this.cartDiscount()));
  cartTax = signal<number>(0);
  cartTotal = signal<number>(0);

  // Payment Dialog
  showPaymentDialog: boolean = false;
  paymentMethod: PaymentMethod = PaymentMethod.Cash;
  paidAmount: number = 0;
  changeAmount: number = 0;
  mixedCashAmount: number = 0;
  mixedCardAmount: number = 0;
  mixedOtherAmount: number = 0;
  mixedOtherLabel: string = 'تحويل بنكي';
  showReceiptDialog = false;
  lastReceipt = signal<CashierReceiptData | null>(null);
  selectedReceiptTemplateId = signal<CashierReceiptTemplateId>('classic');

  // Advanced Features
  heldOrders = signal<CashierHeldOrder[]>([]);
  heldOrdersLoading = signal<boolean>(false);
  showHoldConfirmDialog: boolean = false;
  showHeldOrdersDialog: boolean = false;
  holdOrderName: string = '';

  // Modifiers
  showModifiersDialog: boolean = false;
  selectedCartItem: CartItem | null = null;
  availableModifiers: any[] = [
    { id: 1, name: 'بدون سكر', price: 0 },
    { id: 2, name: 'سكر زيادة', price: 1 },
    { id: 3, name: 'حجم كبير', price: 5 },
    { id: 4, name: 'حليب خالي الدسم', price: 2 },
    { id: 5, name: 'إضافة جبنة', price: 3 },
    { id: 6, name: 'بدون بصل', price: 0 }
  ];
  selectedModifiers: any[] = [];

  // Custom Discount
  showCustomDiscountDialog: boolean = false;
  customDiscountType: 'percent' | 'amount' = 'amount';
  customDiscountValue: number = 0;
  maxAllowedDiscountAmount: number = 0;
  maxAllowedDiscountPercent: number = 0;

  // Customer Info & AutoComplete
  customerName: string = '';
  customerPhone: string = '';
  selectedCustomerId: string | null = null;
  selectedCustomer: any = null;
  customerProfiles: CustomerProfileModel[] = [];
  filteredCustomers: any[] = [];
  readonly fallbackProductImage = this.productImageCatalog[0];

  readonly OrderType = OrderType;
  orderType: OrderType = OrderType.Takeaway;
  selectedTableId: number | null = null;

  canDineIn(): boolean {
    return this.authService.hasPermission('Cashier.DineIn');
  }

  canAssignTable(): boolean {
    return this.authService.hasPermission('Cashier.AssignTable');
  }

  get availableTablesOptions(): Array<{ label: string; value: number }> {
    const tables = this.restaurantModeService.getTablesSnapshot();
    return tables.map(t => ({
      label: `طاولة ${t.tableNumber} - ${t.areaName} (${t.status === 'available' ? 'متاحة' : 'مشغولة'})`,
      value: t.id
    }));
  }

  setOrderType(type: OrderType): void {
    if (type === OrderType.DineIn && !this.canDineIn()) {
      return;
    }
    this.orderType = type;
    if (type !== OrderType.DineIn) {
      this.selectedTableId = null;
    }
  }
  sessionStores: Array<{ label: string; value: string }> = [];
  selectedStoreIds: string[] = [];
  activeStoreId: string = '';
  allStoreOptions: Array<{ label: string; value: string }> = [];
  showEditStoresDialog: boolean = false;
  editSessionStoreIds: string[] = [];
  companyDetails = signal<CompanyDetailsModel | null>(null);

  selectedCheckoutPrintType: string = 'Thermal80mm';
  lastCheckoutInvoiceId: number | null = null;

  // Product Location & Batch Details Modal
  showProductDetailsDialog: boolean = false;
  selectedProductForDetails = signal<CashierProduct | null>(null);

  openProductDetails(product: CashierProduct, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.selectedProductForDetails.set(product);
    this.showProductDetailsDialog = true;
  }

  closeProductDetails(): void {
    this.showProductDetailsDialog = false;
    this.selectedProductForDetails.set(null);
  }

  constructor(
    private cashierService: CashierService,
    private restaurantModeService: RestaurantModeService,
    private receiptTemplateService: CashierReceiptTemplateService,
    private messageService: MessageService,
    private authService: AuthService,
    private translateService: TranslateService,
    private sallaService: SallaIntegrationService,
    private zidOrdersService: ZidOrdersService,
    private destroyRef: DestroyRef,
    private pharmacyPickupService: PharmacyPickupService,
    private pharmacySupportApiService: PharmacySupportApiService,
    private confirmationService: ConfirmationService,
    private storeDetailsService: StoreDetailsService,
    private rootSalesClassService: RootSalesClassService,
    private rootPurchaseClassService: RootPurchaseClassService,
    private companyDetailsService: CompanyDetailsService,
    private salesInvoiceService: SalesInvoiceService,
    private customerProfileService: CustomerProfileService,
    private cashDrawerService: CashDrawerService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.selectedReceiptTemplateId.set(this.receiptTemplateService.currentTemplateId);
    this.receiptTemplateService.selectedTemplateId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((templateId) => this.selectedReceiptTemplateId.set(templateId));

    this.loadCompanyDetails();
    this.loadCustomers();
    this.loadViewPreferences();
    this.loadFavoriteProducts();
    this.loadFavoritePermissions();
    this.loadSalesClassesTree();
    this.loadStoreOptions();
    this.loadCurrentSession();

    this.cashierService.sessionExpired$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((expiredSession) => {
        if (expiredSession) {
          this.messageService.add({
            severity: 'warn',
            summary: 'انتهت الوردية',
            detail: 'انتهت مدة الوردية المحددة. سيتم توجيهك لصفحة الوردية لإغلاقها.'
          });
          setTimeout(() => {
            this.router.navigate(['/cashier/session']);
          }, 2000);
        }
      });
  }

  loadCustomers(): void {
    this.customerProfileService.getAll().subscribe({
      next: (res) => {
        this.customerProfiles = res || [];
      },
      error: (err) => console.error('Failed to load customers for POS:', err)
    });
  }

  searchCustomers(event: { query: string }): void {
    const query = (event.query || '').trim().toLowerCase();
    if (!query) {
      this.filteredCustomers = [...this.customerProfiles];
      return;
    }

    this.filteredCustomers = this.customerProfiles.filter(c => {
      const ar = (c.arabicName || '').toLowerCase();
      const en = (c.englishName || '').toLowerCase();
      const phone = (c.contactNumber || c.additionalContactNumber || '').toLowerCase();
      return ar.includes(query) || en.includes(query) || phone.includes(query);
    });
  }

  onCustomerSelect(selected: any): void {
    if (typeof selected === 'object' && selected !== null) {
      this.selectedCustomerId = selected.id || null;
      this.customerName = selected.arabicName || selected.englishName || '';
      this.customerPhone = selected.contactNumber || selected.additionalContactNumber || this.customerPhone || '';
    } else if (typeof selected === 'string') {
      this.customerName = selected;
      this.selectedCustomerId = null;
    }
  }

  onCustomerFocus(autoComplete: any): void {
    const query = typeof this.selectedCustomer === 'string' ? this.selectedCustomer : '';
    this.searchCustomers({ query });
    if (autoComplete) {
      if (typeof autoComplete.handleDropdownClick === 'function') {
        autoComplete.handleDropdownClick();
      } else if (typeof autoComplete.show === 'function') {
        autoComplete.show();
      }
    }
  }

  onlyNumberKey(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onCustomerPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const sanitized = input.value.replace(/[^0-9]/g, '');
      this.customerPhone = sanitized;
      input.value = sanitized;
    }
  }

  onCustomerTextChange(value: any): void {
    if (typeof value === 'string') {
      this.customerName = value;
      // Check if matches an existing customer exactly
      const match = this.customerProfiles.find(c =>
        (c.arabicName && c.arabicName.trim().toLowerCase() === value.trim().toLowerCase()) ||
        (c.englishName && c.englishName.trim().toLowerCase() === value.trim().toLowerCase())
      );
      if (match) {
        this.selectedCustomerId = match.id || null;
        if (!this.customerPhone && match.contactNumber) {
          this.customerPhone = match.contactNumber;
        }
      } else {
        this.selectedCustomerId = null;
      }
    } else if (value && typeof value === 'object') {
      this.onCustomerSelect(value);
    }
  }

  loadCompanyDetails(): void {
    this.companyDetailsService.getAll().subscribe({
      next: (companies) => {
        if (companies && companies.length > 0) {
          const comp = companies[0];
          this.companyDetails.set(comp);
          const currentRec = this.lastReceipt();
          if (currentRec) {
            const isAr = (this.translateService.currentLang || 'ar').startsWith('ar');
            const compName = isAr ? (comp.arabicName || comp.englishName) : (comp.englishName || comp.arabicName);
            const compPhone = comp.phones?.[0]?.phoneNumber || comp.phone || '';
            this.lastReceipt.set({
              ...currentRec,
              companyName: compName || currentRec.companyName,
              companyLogoUrl: comp.logoUrl || currentRec.companyLogoUrl,
              companyTaxNumber: comp.taxNumber || currentRec.companyTaxNumber,
              companyAddress: (comp.address?.street || comp.street || comp.district || comp.city || '') || currentRec.companyAddress,
              companyPhone: compPhone || currentRec.companyPhone
            });
          }
        }
      },
      error: (err) => console.error('Failed to load company details in POS:', err)
    });
  }

  /**
   * Load current cashier session
   */
  loadCurrentSession(): void {
    this.cashierService.currentSession$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (session) => {
        const previousSessionId = this.currentSession()?.id;
        const previousStoreDetailsId = this.currentSession()?.storeDetailsId;
        this.currentSession.set(session);

        if (session?.id) {
          if (session.id !== previousSessionId) {
            const selectedIdsStr = localStorage.getItem(`cashier_session_stores_${session.id}`);
            let selectedIds: string[] = [];
            if (selectedIdsStr) {
              try {
                selectedIds = JSON.parse(selectedIdsStr);
              } catch (e) {
                selectedIds = [session.storeDetailsId];
              }
            } else {
              selectedIds = [session.storeDetailsId];
            }

            this.activeStoreId = session.storeDetailsId;
            this.selectedStoreIds = [...selectedIds];

            this.storeDetailsService.getAll().subscribe({
              next: (allStores) => {
                const lang = this.translateService.currentLang || 'ar';
                this.allStoreOptions = allStores.map(s => ({
                  label: lang === 'en' ? s.englishName : s.arabicName,
                  value: s.id
                }));
                this.sessionStores = allStores
                  .filter(s => selectedIds.includes(s.id))
                  .map(s => ({
                    label: lang === 'en' ? s.englishName : s.arabicName,
                    value: s.id
                  }));

                if (!this.sessionStores.some(s => s.value === this.activeStoreId) && this.sessionStores.length > 0) {
                  this.activeStoreId = this.sessionStores[0].value;
                }

                this.loadProducts();
                if (this.enablePharmacyMode) {
                  this.loadReadyPrescriptions();
                }
              }
            });
          }
        }

        if (session?.id && session.storeDetailsId) {
          this.loadHeldOrders();
        }

        if (session?.storeDetailsId && session.storeDetailsId !== previousStoreDetailsId && !this.isPharmacyMode) {
          this.sallaService.getCashierOrders(session.storeDetailsId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (res) => this.sallaPendingCount.set(res.pendingCount),
              error: () => this.sallaPendingCount.set(0)
            });

          this.zidOrdersService.getCashierOrders(session.storeDetailsId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (res) => this.zidPendingCount.set(res.totalCount ?? res.items.length ?? 0),
              error: () => this.zidPendingCount.set(0)
            });
        }

        if (!session) {
          this.products.set([]);
          this.sallaPendingCount.set(0);
          this.zidPendingCount.set(0);
          this.readyPrescriptions.set([]);
          this.heldOrders.set([]);
          this.showSessionDialog();
        }
      }
    });
  }

  /**
   * Show session opening dialog
   */
  showSessionDialog(): void {
    // TODO: Implement session opening dialog
    // TODO: Implement session opening dialog
    this.messageService.add({
      severity: 'warn',
      summary: this.translateService.instant('CASHIER_POS.NO_ACTIVE_SESSION_TITLE'),
      detail: this.translateService.instant('CASHIER_POS.PLEASE_OPEN_SESSION_DETAIL')
    });
  }

  /**
   * Load products for POS
   */
  loadProducts(): void {
    const currentSession = this.currentSession();
    if (!currentSession) {
      this.products.set([]);
      return;
    }

    // Check if session has a store assigned
    if (!currentSession.storeDetailsId) {
      this.products.set([]);
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('CASHIER_POS.SESSION_ERROR'),
        detail: this.translateService.instant('CASHIER_POS.SESSION_NO_STORE_DETAIL'),
        life: 5000
      });
      return;
    }

    this.loading.set(true);

    const storeIds = (this.selectedStoreIds && this.selectedStoreIds.length > 0)
      ? this.selectedStoreIds
      : (this.activeStoreId ? [this.activeStoreId] : [currentSession.storeDetailsId]);

    const requests = storeIds.map(storeId =>
      this.cashierService.searchProducts({
        searchTerm: this.searchTerm,
        pageSize: 100,
        inStock: true,
        cashierSessionId: currentSession.id,
        storeDetailsId: storeId
      })
    );

    forkJoin(requests).subscribe({
      next: (results: CashierProduct[][]) => {
        const mergedMap = new Map<string | number, CashierProduct>();

        results.forEach((productList) => {
          (productList || []).forEach((prod: any) => {
            const key = prod.batchNo 
              ? `${prod.id || prod.code}_${prod.batchNo}`
              : (prod.id || prod.code || prod.itemCode || prod.barcode);
            if (!key) return;

            // Extract item code from any possible backend property
            const isGuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
            
            let itemCode = prod.itemCode || prod.productCode || prod.referenceCode || prod.itemNumber || prod.code;
            if (itemCode && isGuid(itemCode)) {
              itemCode = prod.barcode || prod.itemBarcode || '';
            } else if (!itemCode && prod.barcode) {
              itemCode = prod.barcode;
            }

            const normalizedProd: CashierProduct = {
              ...prod,
              code: itemCode || ''
            };

            if (mergedMap.has(key)) {
              const existing = mergedMap.get(key)!;
              existing.availableQuantity = (existing.availableQuantity || 0) + (prod.availableQuantity || 0);
            } else {
              mergedMap.set(key, normalizedProd);
            }
          });
        });

        const mergedProducts = Array.from(mergedMap.values());
        this.products.set(this.decorateProducts(mergedProducts));
        this.updateTreeCategoryCounts();
        this.loading.set(false);
      },
      error: (err) => {
        this.products.set([]);
        this.loading.set(false);
        
        // Handle specific error for session without store
        if (err.status === 403 && err.error?.errorCode === 'SESSION_NO_STORE') {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.SESSION_ERROR'),
            detail: mapError(err, this.translateService.instant('CASHIER_POS.SESSION_WITHOUT_STORE_MSG')),
            life: 6000
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.WARNING'),
            detail: mapError(err, this.translateService.instant('CASHIER_POS.FAILED_TO_LOAD_PRODUCTS')),
            life: 3000
          });
        }
      }
    });
  }

  /**
   * Checkout a ready prescription
   */
  checkoutReadyPrescription(pickupId: string): void {
    if (!this.enablePrescriptionCheckout) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Feature Disabled',
        detail: 'Prescription checkout is currently not enabled.'
      });
      return;
    }

    const session = this.currentSession();
    if (!session?.id || !session.storeDetailsId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Session Error',
        detail: 'No active cashier session or store details found.'
      });
      return;
    }

    this.checkoutRxLoading.set(true);

    this.pharmacySupportApiService.checkoutPrescription({
      pickupId,
      cashierSessionId: String(session.id),
      storeDetailsId: session.storeDetailsId,
      paymentMethod: this.getPharmacyCheckoutPaymentMethod(),
      cashAmount: this.paymentMethod === PaymentMethod.Cash ? this.paidAmount : undefined,
      cardAmount: this.paymentMethod === PaymentMethod.Card ? this.getPaymentDueAmount() : undefined,
      notes: ''
    }).subscribe({
      next: (res) => {
        this.checkoutRxLoading.set(false);
        if (!res.success) {
          this.messageService.add({
            severity: 'error',
            summary: 'Checkout Failed',
            detail: res.error || 'An error occurred during checkout.'
          });
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Checkout Successful',
          detail: `Invoice ${res.invoiceNo || res.invoiceId} generated.`
        });
        this.loadReadyPrescriptions();
      },
      error: (error) => {
        this.checkoutRxLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Checkout Error',
          detail: mapError(error, 'Failed to complete prescription checkout.')
        });
      }
    });
  }

  /**
   * Load mock data for testing (TODO: Remove after backend is ready)
   */
  private loadMockData(): void {
    const mockProducts: CashierProduct[] = [
      {
        id: 1,
        code: 'PROD-001',
        barcode: '1234567890123',
        nameAr: 'لابتوب HP',
        nameEn: 'HP Laptop',
        sellingPrice: 3500.00,
        costPrice: 2800.00,
        availableQuantity: 15,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'إلكترونيات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 2,
        code: 'PROD-002',
        barcode: '2234567890123',
        nameAr: 'ماوس لاسلكي',
        nameEn: 'Wireless Mouse',
        sellingPrice: 85.00,
        costPrice: 60.00,
        availableQuantity: 45,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 3,
        code: 'PROD-003',
        barcode: '3234567890123',
        nameAr: 'كيبورد ميكانيكي',
        nameEn: 'Mechanical Keyboard',
        sellingPrice: 250.00,
        costPrice: 180.00,
        availableQuantity: 20,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 4,
        code: 'PROD-004',
        barcode: '4234567890123',
        nameAr: 'شاشة سامسونج 27 بوصة',
        nameEn: 'Samsung 27" Monitor',
        sellingPrice: 1200.00,
        costPrice: 950.00,
        availableQuantity: 8,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'إلكترونيات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 5,
        code: 'PROD-005',
        barcode: '5234567890123',
        nameAr: 'سماعات بلوتوث',
        nameEn: 'Bluetooth Headphones',
        sellingPrice: 299.00,
        costPrice: 220.00,
        availableQuantity: 30,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 6,
        code: 'PROD-006',
        barcode: '6234567890123',
        nameAr: 'طابعة HP LaserJet',
        nameEn: 'HP LaserJet Printer',
        sellingPrice: 1800.00,
        costPrice: 1400.00,
        availableQuantity: 5,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'إلكترونيات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 7,
        code: 'PROD-007',
        barcode: '7234567890123',
        nameAr: 'فلاش ميموري 64GB',
        nameEn: 'USB Flash 64GB',
        sellingPrice: 45.00,
        costPrice: 30.00,
        availableQuantity: 100,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'تخزين',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 8,
        code: 'PROD-008',
        barcode: '8234567890123',
        nameAr: 'هارد ديسك خارجي 1TB',
        nameEn: 'External HDD 1TB',
        sellingPrice: 280.00,
        costPrice: 210.00,
        availableQuantity: 25,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'تخزين',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 9,
        code: 'PROD-009',
        barcode: '9234567890123',
        nameAr: 'كابل HDMI',
        nameEn: 'HDMI Cable',
        sellingPrice: 35.00,
        costPrice: 20.00,
        availableQuantity: 80,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 10,
        code: 'PROD-010',
        barcode: '0234567890123',
        nameAr: 'ويب كام HD',
        nameEn: 'HD Webcam',
        sellingPrice: 180.00,
        costPrice: 130.00,
        availableQuantity: 18,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 11,
        code: 'PROD-011',
        barcode: '1134567890123',
        nameAr: 'ماوس باد',
        nameEn: 'Mouse Pad',
        sellingPrice: 25.00,
        costPrice: 12.00,
        availableQuantity: 60,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 12,
        code: 'PROD-012',
        barcode: '1294567890123',
        nameAr: 'حامل لابتوب',
        nameEn: 'Laptop Stand',
        sellingPrice: 95.00,
        costPrice: 65.00,
        availableQuantity: 22,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 13,
        code: 'PROD-013',
        barcode: '1334567890123',
        nameAr: 'سماعة مكتب USB',
        nameEn: 'USB Desk Speaker',
        sellingPrice: 145.00,
        costPrice: 105.00,
        availableQuantity: 19,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 14,
        code: 'PROD-014',
        barcode: '1434567890123',
        nameAr: 'راوتر واي فاي',
        nameEn: 'WiFi Router',
        sellingPrice: 320.00,
        costPrice: 250.00,
        availableQuantity: 14,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'شبكات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 15,
        code: 'PROD-015',
        barcode: '1534567890123',
        nameAr: 'سويتش شبكة 8 منافذ',
        nameEn: '8-Port Network Switch',
        sellingPrice: 210.00,
        costPrice: 160.00,
        availableQuantity: 11,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'شبكات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 16,
        code: 'PROD-016',
        barcode: '1634567890123',
        nameAr: 'بطارية لابتوب',
        nameEn: 'Laptop Battery',
        sellingPrice: 260.00,
        costPrice: 190.00,
        availableQuantity: 13,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'صيانة',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 17,
        code: 'PROD-017',
        barcode: '1734567890123',
        nameAr: 'شاحن USB-C 65W',
        nameEn: 'USB-C Charger 65W',
        sellingPrice: 130.00,
        costPrice: 85.00,
        availableQuantity: 38,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 18,
        code: 'PROD-018',
        barcode: '1834567890123',
        nameAr: 'كابل تايب سي',
        nameEn: 'Type-C Cable',
        sellingPrice: 28.00,
        costPrice: 14.00,
        availableQuantity: 120,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 19,
        code: 'PROD-019',
        barcode: '1934567890123',
        nameAr: 'قرص SSD سعة 512GB',
        nameEn: 'SSD 512GB',
        sellingPrice: 340.00,
        costPrice: 275.00,
        availableQuantity: 24,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'تخزين',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 20,
        code: 'PROD-020',
        barcode: '2034567890123',
        nameAr: 'رام 16GB DDR4',
        nameEn: 'RAM 16GB DDR4',
        sellingPrice: 220.00,
        costPrice: 170.00,
        availableQuantity: 17,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'صيانة',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 21,
        code: 'PROD-021',
        barcode: '2134567890123',
        nameAr: 'لوحة مفاتيح لاسلكية',
        nameEn: 'Wireless Keyboard',
        sellingPrice: 110.00,
        costPrice: 75.00,
        availableQuantity: 32,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 22,
        code: 'PROD-022',
        barcode: '2235567890123',
        nameAr: 'طابعة حرارية POS',
        nameEn: 'POS Thermal Printer',
        sellingPrice: 690.00,
        costPrice: 520.00,
        availableQuantity: 9,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'نقاط البيع',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 23,
        code: 'PROD-023',
        barcode: '2334567890123',
        nameAr: 'درج كاشير معدني',
        nameEn: 'Cash Drawer',
        sellingPrice: 390.00,
        costPrice: 305.00,
        availableQuantity: 10,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'نقاط البيع',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 24,
        code: 'PROD-024',
        barcode: '2434567890123',
        nameAr: 'ماسح باركود لاسلكي',
        nameEn: 'Wireless Barcode Scanner',
        sellingPrice: 420.00,
        costPrice: 335.00,
        availableQuantity: 16,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'نقاط البيع',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 25,
        code: 'PROD-025',
        barcode: '2534567890123',
        nameAr: 'رول ورق حراري',
        nameEn: 'Thermal Paper Roll',
        sellingPrice: 12.00,
        costPrice: 6.00,
        availableQuantity: 300,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'استهلاكي',
        isActive: true,
        unitName: 'رول'
      },
      {
        id: 26,
        code: 'PROD-026',
        barcode: '2634567890123',
        nameAr: 'باور بانك 20000mAh',
        nameEn: 'Power Bank 20000mAh',
        sellingPrice: 240.00,
        costPrice: 185.00,
        availableQuantity: 21,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'طاقة',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 27,
        code: 'PROD-027',
        barcode: '2734567890123',
        nameAr: 'سماعة رأس احترافية',
        nameEn: 'Pro Headset',
        sellingPrice: 360.00,
        costPrice: 285.00,
        availableQuantity: 14,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'ملحقات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 28,
        code: 'PROD-028',
        barcode: '2834567890123',
        nameAr: 'كاميرا مراقبة واي فاي',
        nameEn: 'WiFi Security Camera',
        sellingPrice: 530.00,
        costPrice: 420.00,
        availableQuantity: 12,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'إلكترونيات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 29,
        code: 'PROD-029',
        barcode: '2934567890123',
        nameAr: 'شاشة POS تعمل باللمس',
        nameEn: 'POS Touch Screen',
        sellingPrice: 1450.00,
        costPrice: 1180.00,
        availableQuantity: 7,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'نقاط البيع',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 30,
        code: 'PROD-030',
        barcode: '3034567890123',
        nameAr: 'جهاز نقاط بيع محمول',
        nameEn: 'Portable POS Terminal',
        sellingPrice: 980.00,
        costPrice: 790.00,
        availableQuantity: 9,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'نقاط البيع',
        isActive: true,
        unitName: 'قطعة'
      }
    ];

    const mergedProducts = this.mergeWithSupplementalProducts(mockProducts);
    this.products.set(this.decorateProducts(mergedProducts));

    // Mock session
    const mockSession: CashierSession = {
      id: 1,
      sessionNumber: 'SS-2026-001',
      cashierUserId: 1,
      cashierUserName: 'محمد أحمد',
      openingDate: new Date(),
      openingBalance: 1000,
      status: 0, // Open
      totalSales: 0,
      totalCash: 0,
      totalCard: 0
    };

    if (!this.currentSession()) {
      this.currentSession.set(mockSession);
    }
  }

  treeCategories = signal<Array<{ id: string | number; name: string; icon?: string; productCount: number; mainSalesClassIds: Set<string | number> }>>([]);
  selectedCategory = signal<string | number | null>(null);

  loadSalesClassesTree(): void {
    forkJoin({
      salesRoots: this.rootSalesClassService.getAll(),
      purchaseRoots: this.rootPurchaseClassService.getAll()
    }).subscribe({
      next: ({ salesRoots, purchaseRoots }: { salesRoots: RootSalesClassModel[], purchaseRoots: RootPurchaseClassModel[] }) => {
        const lang = this.translateService.currentLang || 'ar';
        const cats: Array<{ id: string | number; name: string; icon?: string; productCount: number; mainSalesClassIds: Set<string | number> }> = [];

        // 1. Process Sales Classes
        (salesRoots || []).forEach(root => {
          const rootName = lang === 'en' ? (root.englishName || root.arabicName) : (root.arabicName || root.englishName);
          const rootIds = new Set<string | number>();

          (root.headerSalesClasses || []).forEach(header => {
            (header.detailSalesClasses || []).forEach(detail => {
              (detail.mainSalesClasses || []).forEach(main => {
                if (main.id) rootIds.add(main.id);
                if (main.referenceCode) rootIds.add(main.referenceCode);
              });
            });
          });

          cats.push({
            id: `sales_${root.id}`,
            name: rootName,
            icon: root.icon,
            productCount: 0,
            mainSalesClassIds: rootIds
          });
        });

        // 2. Process Purchase Classes
        (purchaseRoots || []).forEach(root => {
          const rootName = lang === 'en' ? (root.englishName || root.arabicName) : (root.arabicName || root.englishName);
          const rootIds = new Set<string | number>();

          (root.headerPurchaseClasses || []).forEach(header => {
            (header.detailPurchaseClasses || []).forEach(detail => {
              (detail.mainPurchaseClasses || []).forEach(main => {
                if (main.id) rootIds.add(main.id);
                if (main.referenceCode) rootIds.add(main.referenceCode);
              });
            });
          });

          // Check if category name already exists to merge IDs or add as new
          const existingCat = cats.find(c => c.name?.trim().toLowerCase() === rootName?.trim().toLowerCase());
          if (existingCat) {
            rootIds.forEach(id => existingCat.mainSalesClassIds.add(id));
          } else {
            cats.push({
              id: `purch_${root.id}`,
              name: rootName,
              icon: root.icon,
              productCount: 0,
              mainSalesClassIds: rootIds
            });
          }
        });

        this.treeCategories.set(cats);
        this.updateTreeCategoryCounts();
      },
      error: () => {
        this.treeCategories.set([]);
      }
    });
  }

  private updateTreeCategoryCounts(): void {
    const cats = this.treeCategories();
    if (!cats.length) return;

    const prods = this.products();
    cats.forEach(cat => {
      cat.productCount = prods.filter(p => {
        const pId: any = (p as any).mainSalesClassId || p.id || p.code;
        const pCode: any = p.code || (p as any).productCode || (p as any).itemCode;
        return cat.mainSalesClassIds.has(pId) || (pCode && cat.mainSalesClassIds.has(pCode)) || (p.categoryNameAr === cat.name || p.categoryNameEn === cat.name);
      }).length;
    });

    this.treeCategories.set([...cats]);
  }

  get categories(): Array<{ id: string | number; name: string; count: number; icon?: string }> {
    const tree = this.treeCategories();
    if (tree.length > 0) {
      return tree
        .filter(t => t.productCount > 0)
        .map(t => ({
          id: t.id,
          name: t.name,
          count: t.productCount,
          icon: t.icon
        }));
    }

    // Fallback if sales classes tree not configured
    const categoryMap = new Map<string | number, { name: string; count: number }>();
    this.products().forEach(p => {
      const catKey = p.categoryNameAr || p.categoryNameEn || p.categoryId || 'أخرى';
      const catName = p.categoryNameAr || p.categoryNameEn || (typeof catKey === 'string' ? catKey : 'أخرى');
      if (categoryMap.has(catKey)) {
        categoryMap.get(catKey)!.count++;
      } else {
        categoryMap.set(catKey, { name: catName, count: 1 });
      }
    });

    return Array.from(categoryMap.entries())
      .filter(([id, val]) => val.count > 0)
      .map(([id, val]) => ({
        id,
        name: val.name,
        count: val.count
      }));
  }

  selectCategory(categoryId: string | number | null): void {
    this.selectedCategory.set(categoryId);
  }

  get displayProducts(): CashierProduct[] {
    const favorites = new Set(this.favoriteProductIds());
    const currentCatId = this.selectedCategory();

    let filtered = this.products();

    if (currentCatId !== null) {
      const treeCat = this.treeCategories().find(t => t.id === currentCatId);
      if (treeCat) {
        filtered = filtered.filter(product => {
          const pId: any = (product as any).mainSalesClassId || product.id || product.code;
          const pCode: any = product.code || (product as any).productCode || (product as any).itemCode;
          return treeCat.mainSalesClassIds.has(pId) || 
                 (pCode && treeCat.mainSalesClassIds.has(pCode)) || 
                 (product.categoryNameAr === treeCat.name || product.categoryNameEn === treeCat.name);
        });
      } else {
        filtered = filtered.filter(product => {
          const productCat = product.categoryNameAr || product.categoryNameEn || product.categoryId || 'أخرى';
          return productCat === currentCatId;
        });
      }
    }

    return [...filtered].sort((a, b) => {
      const favoriteWeightA = favorites.has(a.id) ? 0 : 1;
      const favoriteWeightB = favorites.has(b.id) ? 0 : 1;

      if (favoriteWeightA !== favoriteWeightB) {
        return favoriteWeightA - favoriteWeightB;
      }

      const nameA = a.nameAr || a.nameEn || '';
      const nameB = b.nameAr || b.nameEn || '';
      return nameA.localeCompare(nameB);
    });
  }

  hasAnyImages(): boolean {
    return this.products().some(p => !!p.image);
  }

  get favoriteCount(): number {
    const availableIds = new Set(this.products().map(product => product.id));
    return this.favoriteProductIds().filter(id => availableIds.has(id)).length;
  }

  isRestaurantMode: boolean = false;

  setMode(mode: 'normal' | 'pharmacy' | 'restaurant'): void {
    if (this.cart().length > 0) {
      this.confirmationService.confirm({
        header: 'تأكيد تغيير الوضع',
        message: 'تغيير وضع البيع سيقوم بمسح سلة المشتريات الحالية. هل تود الاستمرار؟',
        icon: 'pi pi-exclamation-triangle',
        accept: () => this.applyMode(mode)
      });
      return;
    }
    this.applyMode(mode);
  }

  private applyMode(mode: 'normal' | 'pharmacy' | 'restaurant', showToast: boolean = true): void {
    this.isPharmacyMode = mode === 'pharmacy';
    this.isRestaurantMode = mode === 'restaurant';
    try {
      localStorage.setItem('cashier.pos.activeMode', mode);
    } catch {}
    
    if (showToast) {
      let summary = 'وضع البيع العادي';
      let detail = 'تم العودة لوضع البيع العادي.';
      let severity = 'secondary';
      
      if (this.isPharmacyMode) {
        summary = 'وضع الصيدلية';
        detail = 'تم تفعيل وضع الصيدلية — الكمية عبر المسح فقط.';
        severity = 'info';
      } else if (this.isRestaurantMode) {
        summary = 'وضع المطعم';
        detail = 'تم تفعيل وضع المطعم — الطلبات سترسل للمطبخ.';
        severity = 'warning';
      }
      
      this.messageService.add({ severity, summary, detail });
    }

    if (this.cart().length > 0) {
      this.clearCart();
    }
    this.catalogPane = 'products';
  }

  onCatalogPaneChange(pane: 'products' | 'readyRx'): void {
    this.catalogPane = pane;
    if (pane === 'readyRx' && this.enablePharmacyMode) {
      this.loadReadyPrescriptions();
    }
  }

  loadReadyPrescriptions(): void {
    if (!this.enablePharmacyMode) {
      return;
    }
    const session = this.currentSession();
    if (!session?.storeDetailsId) {
      this.readyPrescriptions.set([]);
      this.readyRxError.set(null);
      return;
    }
    this.readyRxLoading.set(true);
    this.readyRxError.set(null);
    this.pharmacyPickupService.listReadyForPickup(this.activeStoreId || session.storeDetailsId).subscribe({
      next: (rows) => {
        this.readyPrescriptions.set(rows || []);
        this.readyRxLoading.set(false);
      },
      error: (error) => {
        this.readyPrescriptions.set([]);
        this.readyRxLoading.set(false);
        this.readyRxError.set(mapError(error, this.translateService.instant('CASHIER_POS.READY_RX_LOAD_ERROR')));
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_POS.WARNING'),
          detail: mapError(error, this.translateService.instant('CASHIER_POS.READY_RX_LOAD_ERROR'))
        });
      }
    });
  }

  onActiveStoreChange(): void {
    if (this.cart().length > 0) {
      this.clearCart();
    }
    this.loadProducts();
    if (this.enablePharmacyMode) {
      this.loadReadyPrescriptions();
    }
  }

  prescriptionAlreadyInCart(prescriptionId: string): boolean {
    return this.cart().some((line) => line.prescriptionMeta?.prescriptionId === prescriptionId);
  }

  addReadyPrescriptionToCart(rx: ReadyPrescriptionDto): void {
    if (!rx?.lines?.length) {
      return;
    }
    if (this.hasRetailItemsInCart()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: 'Complete or clear the retail cart before adding a prescription.'
      });
      return;
    }
    if (this.hasPrescriptionItemsInCart()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: 'Only one prescription can be checked out at a time.'
      });
      return;
    }
    if (rx.pickupStatus === 'picked_up') {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.READY_RX_PICKED_TITLE'),
        detail: this.translateService.instant('CASHIER_POS.READY_RX_PICKED_DETAIL')
      });
      return;
    }
    if (rx.pickupStatus !== 'ready_for_pickup') {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: 'This prescription is no longer ready for pickup.'
      });
      return;
    }
    if (this.prescriptionAlreadyInCart(rx.prescriptionId)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.READY_RX_DUPLICATE_TITLE'),
        detail: this.translateService.instant('CASHIER_POS.READY_RX_DUPLICATE_DETAIL')
      });
      return;
    }

    const currentCart = [...this.cart()];
    if (!this.isPharmacyMode) {
      this.isPharmacyMode = true;
      this.messageService.add({
        severity: 'info',
        summary: 'Pharmacy Mode',
        detail: 'Pharmacy mode was enabled automatically for prescription checkout.'
      });
    }
    for (const line of rx.lines) {
      const taxPct = line.taxPercentage ?? 15;
      const newItem: CartItem = {
        itemId: this.syntheticLineItemId(rx.prescriptionId, line.prescriptionItemId),
        itemCode: line.prescriptionItemId,
        itemName: line.name,
        itemBarcode: line.batchNo || undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: taxPct,
        taxAmount: 0,
        totalAmount: 0,
        availableQuantity: 9999,
        unitName: 'وحدة',
        prescriptionMeta: {
          pickupId: rx.pickupId,
          prescriptionId: rx.prescriptionId,
          prescriptionItemId: line.prescriptionItemId,
          catalogItemId: line.itemId,
          prescriptionNo: rx.prescriptionNo,
          batchNo: line.batchNo,
          expiryDate: line.expiryDate,
          allocationStatus: line.allocationStatus,
          patientShare: line.patientShare ?? null,
          insuranceShare: line.insuranceShare ?? null
        },
        notes: line.expiryDate ? `صلاحية: ${line.expiryDate}` : undefined
      };
      this.updateItemTotal(newItem);
      currentCart.push(newItem);
    }

    this.cart.set(currentCart);
    this.calculateCartTotals();

    if (rx.patientName) {
      this.customerName = rx.patientName;
    }

    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_POS.READY_RX_ADDED_TITLE'),
      detail: this.translateService.instant('CASHIER_POS.READY_RX_ADDED_DETAIL', { no: rx.prescriptionNo })
    });
  }

  expirySeverity(isoDate?: string | null): 'ok' | 'warn' | 'danger' | 'unknown' {
    if (!isoDate) {
      return 'unknown';
    }
    const exp = new Date(isoDate);
    if (Number.isNaN(exp.getTime())) {
      return 'unknown';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expMidnight = new Date(exp);
    expMidnight.setHours(0, 0, 0, 0);

    const diffMs = expMidnight.getTime() - today.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return 'danger'; // منتهي الصلاحية (مضى تاريخه)
    }
    if (days <= 60) {
      return 'warn'; // قريب الانتهاء (أقل من شهرين)
    }
    return 'ok'; // ساري الصلاحية
  }

  private syntheticLineItemId(prescriptionId: string, prescriptionItemId: string): number {
    const key = `${prescriptionId}:${prescriptionItemId}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return -(Math.abs(hash) % 900000000 + 10000);
  }

  toggleProductImages(): void {
    const nextValue = !this.showProductImages();
    this.showProductImages.set(nextValue);
    localStorage.setItem(this.showImagesStorageKey, String(nextValue));
  }

  switchViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    localStorage.setItem('cashier.pos.viewMode', mode);
  }

  toggleFavorite(product: CashierProduct, event: Event): void {
    event.stopPropagation();

    if (!this.canManageFavorites()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.PERMISSION_REQUIRED'),
        detail: this.translateService.instant('CASHIER_POS.FAVORITES_ADMIN_ONLY'),
        life: 1800
      });
      return;
    }

    const nextFavorites = new Set(this.favoriteProductIds());
    if (nextFavorites.has(product.id)) {
      nextFavorites.delete(product.id);
    } else {
      nextFavorites.add(product.id);
    }

    const favoriteIds = Array.from(nextFavorites);
    this.favoriteProductIds.set(favoriteIds);
    localStorage.setItem(this.favoriteProductsStorageKey, JSON.stringify(favoriteIds));
    this.products.set(this.decorateProducts(this.products()));

    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_POS.UPDATED'),
      detail: nextFavorites.has(product.id)
        ? this.translateService.instant('CASHIER_POS.ADDED_TO_FAVORITES')
        : this.translateService.instant('CASHIER_POS.REMOVED_FROM_FAVORITES'),
      life: 1200
    });
  }

  onProductImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.src = this.fallbackProductImage;
  }

  private loadViewPreferences(): void {
    const savedShowImages = localStorage.getItem(this.showImagesStorageKey);
    if (savedShowImages !== null) {
      this.showProductImages.set(savedShowImages === 'true');
    }
    const savedViewMode = localStorage.getItem('cashier.pos.viewMode') as 'grid' | 'list' | null;
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      this.viewMode.set(savedViewMode);
    }
    const savedPosMode = localStorage.getItem('cashier.pos.activeMode') as 'normal' | 'pharmacy' | 'restaurant' | null;
    if (savedPosMode === 'pharmacy') {
      this.isPharmacyMode = true;
      this.isRestaurantMode = false;
    } else if (savedPosMode === 'restaurant') {
      this.isPharmacyMode = false;
      this.isRestaurantMode = true;
    } else if (savedPosMode === 'normal') {
      this.isPharmacyMode = false;
      this.isRestaurantMode = false;
    }
  }

  private loadFavoriteProducts(): void {
    try {
      const storedValue = localStorage.getItem(this.favoriteProductsStorageKey);
      if (!storedValue) {
        return;
      }

      const parsed = JSON.parse(storedValue);
      const ids = Array.isArray(parsed)
        ? parsed
          .map(id => Number(id))
          .filter((id): id is number => Number.isInteger(id) && id > 0)
        : [];

      this.favoriteProductIds.set(ids);
    } catch {
      this.favoriteProductIds.set([]);
    }
  }

  private loadFavoritePermissions(): void {
    this.authService.getUserByToken().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        const roleNames = user?.userRoles
          ?.map(userRole => userRole?.role?.name?.toLowerCase().trim())
          .filter((name): name is string => !!name) || [];

        const allowed = roleNames.some(roleName =>
          roleName === 'system.admin' ||
          roleName === 'admin' ||
          roleName === 'administrator' ||
          roleName === 'system.manager' ||
          roleName === 'manager' ||
          roleName.endsWith('.admin') ||
          roleName.endsWith('.manager') ||
          roleName.includes('مدير')
        );

        this.canManageFavorites.set(allowed);
        this.loadPricingPermissions(user);
      },
      error: () => {
        this.canManageFavorites.set(false);
        this.loadPricingPermissions();
      }
    });
  }

  private loadPricingPermissions(user?: any): void {
    const hasRetail = this.authService.hasPermission('Cashier.Pricing.Retail', user);
    const hasWholesale = this.authService.hasPermission('Cashier.Pricing.Wholesale', user);
    const hasBulk = this.authService.hasPermission('Cashier.Pricing.Bulk', user);
    const hasPurchase = this.authService.hasPermission('Cashier.Pricing.Purchase', user);

    // Business type modes permissions
    const hasSupermarket = this.authService.hasPermission('Cashier.POS', user);
    const hasPharmacy = this.authService.hasPermission('Cashier.Pharmacy', user);
    const hasRestaurant = this.authService.hasPermission('Cashier.Restaurant', user);

    // Invoice actions permissions (Discount & Edit Price at checkout)
    const hasDiscountPerm = this.authService.hasPermission('Cashier.Invoice.Discount', user);
    const hasEditPricePerm = this.authService.hasPermission('Cashier.Invoice.EditPrice', user);

    this.canApplyDiscount.set(hasDiscountPerm);
    this.canEditPrice.set(hasEditPricePerm);

    // If user has specific pricing permissions assigned, respect them.
    // If no pricing permissions are defined yet (backward compatibility), allow retail by default.
    const anyPricingAssigned = hasRetail || hasWholesale || hasBulk || hasPurchase;

    const retailAllowed = anyPricingAssigned ? hasRetail : true;
    const wholesaleAllowed = anyPricingAssigned ? hasWholesale : true;
    const bulkAllowed = anyPricingAssigned ? hasBulk : true;
    const purchaseAllowed = anyPricingAssigned ? hasPurchase : false;

    this.canViewRetailPrice.set(retailAllowed);
    this.canViewWholesalePrice.set(wholesaleAllowed);
    this.canViewBulkPrice.set(bulkAllowed);
    this.canViewPurchasePrice.set(purchaseAllowed);

    this.canAccessSupermarketMode.set(hasSupermarket);
    this.canAccessPharmacyMode.set(hasPharmacy);
    this.canAccessRestaurantMode.set(hasRestaurant);

    // Automatically restore saved POS mode preference if permitted, or fallback gracefully
    const savedPosMode = localStorage.getItem('cashier.pos.activeMode') as 'normal' | 'pharmacy' | 'restaurant' | null;
    if (savedPosMode === 'pharmacy' && (hasPharmacy || !hasSupermarket) && this.enablePharmacyMode) {
      this.applyMode('pharmacy', false);
    } else if (savedPosMode === 'restaurant' && (hasRestaurant || !hasSupermarket)) {
      this.applyMode('restaurant', false);
    } else if (savedPosMode === 'normal' && (hasSupermarket || (!hasPharmacy && !hasRestaurant))) {
      this.applyMode('normal', false);
    } else if (savedPosMode && ((savedPosMode === 'pharmacy' && this.enablePharmacyMode) || savedPosMode === 'restaurant' || savedPosMode === 'normal')) {
      this.applyMode(savedPosMode, false);
    } else {
      if (hasSupermarket) {
        this.applyMode('normal', false);
      } else if (hasPharmacy && this.enablePharmacyMode) {
        this.applyMode('pharmacy', false);
      } else if (hasRestaurant) {
        this.applyMode('restaurant', false);
      }
    }

    // Set active default mode based on what's allowed, preserving saved selection
    const savedMode = (localStorage.getItem('pos_pricing_mode') as 'retail' | 'wholesale' | 'bulk' | 'purchase') || null;
    if (savedMode === 'retail' && retailAllowed) {
      this.pricingMode.set('retail');
    } else if (savedMode === 'wholesale' && wholesaleAllowed) {
      this.pricingMode.set('wholesale');
    } else if (savedMode === 'bulk' && bulkAllowed) {
      this.pricingMode.set('bulk');
    } else if (savedMode === 'purchase' && purchaseAllowed) {
      this.pricingMode.set('purchase');
    } else if (retailAllowed) {
      this.pricingMode.set('retail');
    } else if (wholesaleAllowed) {
      this.pricingMode.set('wholesale');
    } else if (bulkAllowed) {
      this.pricingMode.set('bulk');
    } else if (purchaseAllowed) {
      this.pricingMode.set('purchase');
    }
  }

  private decorateProducts(products: CashierProduct[]): CashierProduct[] {
    const favoriteIds = new Set(this.favoriteProductIds());
    return products.map((product, index) => {
      const actualImage = (product.image && product.image !== 'null' && product.image !== 'undefined' && product.image.trim() !== '') ? product.image : undefined;
      return {
        ...product,
        image: actualImage,
        isFavorite: favoriteIds.has(product.id)
      };
    });
  }

  private mergeWithSupplementalProducts(apiProducts: CashierProduct[]): CashierProduct[] {
    const merged = [...apiProducts];
    const existingIds = new Set(merged.map(product => product.id));
    const existingCodes = new Set(merged.map(product => (product.code || '').trim().toLowerCase()));
    const existingBarcodes = new Set(
      merged
        .map(product => (product.barcode || '').trim())
        .filter(barcode => !!barcode)
    );

    for (const product of this.supplementalProducts) {
      const code = (product.code || '').trim().toLowerCase();
      const barcode = (product.barcode || '').trim();
      const isDuplicate =
        existingIds.has(product.id) ||
        (code && existingCodes.has(code)) ||
        (barcode && existingBarcodes.has(barcode));

      if (isDuplicate) {
        continue;
      }

      merged.push({ ...product });
      existingIds.add(product.id);
      if (code) {
        existingCodes.add(code);
      }
      if (barcode) {
        existingBarcodes.add(barcode);
      }
    }

    return merged;
  }

  private resolveProductImage(product: CashierProduct, index: number): string {
    const textIndex = `${product.nameEn || ''} ${product.categoryNameEn || ''}`.toLowerCase();
    const categoryIndex = `${product.categoryNameAr || ''} ${product.nameAr || ''}`.toLowerCase();

    if (textIndex.includes('laptop')) return 'assets/media/cashier-products/laptop.jpg';
    if (textIndex.includes('mouse')) return 'assets/media/cashier-products/mouse.jpg';
    if (textIndex.includes('keyboard')) return 'assets/media/cashier-products/keyboard.jpg';
    if (textIndex.includes('monitor')) return 'assets/media/cashier-products/monitor.jpg';
    if (textIndex.includes('headphone') || textIndex.includes('speaker')) return 'assets/media/cashier-products/headphones.jpg';
    if (textIndex.includes('printer')) return 'assets/media/cashier-products/printer.jpg';
    if (textIndex.includes('flash') || textIndex.includes('usb')) return 'assets/media/cashier-products/usb.jpg';
    if (textIndex.includes('hdd') || textIndex.includes('hard') || textIndex.includes('storage')) return 'assets/media/cashier-products/storage.jpg';

    if (categoryIndex.includes('تخزين')) return 'assets/media/cashier-products/storage.jpg';
    if (categoryIndex.includes('ملحق')) return 'assets/media/cashier-products/accessories.jpg';
    if (categoryIndex.includes('الكترون')) return 'assets/media/cashier-products/monitor.jpg';

    const itemSeed = Number.isFinite(product.id) && product.id > 0 ? product.id : index;
    return this.productImageCatalog[itemSeed % this.productImageCatalog.length];
  }

  /**
   * Switch pricing mode (retail / wholesale / bulk / purchase)
   */
  switchPricingMode(mode: 'retail' | 'wholesale' | 'bulk' | 'purchase'): void {
    this.pricingMode.set(mode);
    try {
      localStorage.setItem('pos_pricing_mode', mode);
    } catch {}
  }

  /**
   * Get active price based on selected pricing mode
   */
  getActivePrice(product: CashierProduct): number {
    const mode = this.pricingMode();
    if (mode === 'purchase' && product.costPrice && product.costPrice > 0) {
      return product.costPrice;
    }
    if (mode === 'wholesale' && product.wholesalePrice && product.wholesalePrice > 0) {
      return product.wholesalePrice;
    }
    if (mode === 'bulk' && product.bulkPrice && product.bulkPrice > 0) {
      return product.bulkPrice;
    }
    if (mode === 'retail' && product.retailPrice && product.retailPrice > 0) {
      return product.retailPrice;
    }
    return product.sellingPrice;
  }

  /**
   * Search products
   */
  onSearch(): void {
    this.loadProducts();
  }

  /**
   * Add product to cart
   */
  addToCart(product: CashierProduct): void {
    const activePrice = this.getActivePrice(product);
    if (this.hasPrescriptionItemsInCart()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: 'Prescription checkout must be completed separately from retail items.'
      });
      return;
    }

    const currentCart = this.cart();
    const existingItem = currentCart.find(item => item.itemId === product.id && (!product.batchNo || item.batchNo === product.batchNo));

    if (existingItem) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: 'المنتج والتشغيلة موجودة بالفعل في السلة',
        life: 1200
      });
      return;
    }

    // Add new item (once)
    const newItem: CartItem = {
      itemId: product.id,
      itemCode: product.code,
      itemName: product.nameAr || product.nameEn,
      itemBarcode: product.barcode,
      quantity: 1,
      unitPrice: activePrice,
      costPrice: product.costPrice,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: product.taxPercentage,
      taxAmount: 0,
      totalAmount: activePrice,
      availableQuantity: product.availableQuantity,
      unitName: product.unitName,
      batchNo: product.batchNo,
      expiryDate: product.expiryDate
    };
    this.updateItemTotal(newItem);
    currentCart.push(newItem);

    this.cart.set([...currentCart]);
    this.calculateCartTotals();

    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_POS.ADDED'),
      detail: this.translateService.instant('CASHIER_POS.PRODUCT_ADDED_TO_CART'),
      life: 1000
    });
  }

  /**
   * Update item quantity
   */
  updateQuantity(item: CartItem, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeFromCart(item);
      return;
    }

    if (item.availableQuantity && newQuantity > item.availableQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.INSUFFICIENT_STOCK'),
        detail: this.translateService.instant('CASHIER_POS.UNITS_AVAILABLE', { count: item.availableQuantity })
      });
      return;
    }

    item.quantity = newQuantity;
    this.updateItemTotal(item);
    this.cart.set([...this.cart()]);
    this.calculateCartTotals();
  }

  onQuantityInputChange(item: CartItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) {
      val = 1;
    }
    if (item.availableQuantity && val > item.availableQuantity) {
      val = item.availableQuantity;
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.INSUFFICIENT_STOCK'),
        detail: this.translateService.instant('CASHIER_POS.UNITS_AVAILABLE', { count: item.availableQuantity })
      });
    }
    input.value = val.toString();
    this.updateQuantity(item, val);
  }

  /**
   * Modifiers Feature -> open dialog
   */
  openModifiers(item: CartItem): void {
    this.selectedCartItem = item;
    // Load existing modifiers if any
    this.selectedModifiers = [...(item.modifiers || [])];
    this.showModifiersDialog = true;
  }

  saveModifiers(): void {
    if (this.selectedCartItem) {
      this.selectedCartItem.modifiers = [...this.selectedModifiers];
      this.selectedCartItem.modifiersTotal = this.selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
      this.updateItemTotal(this.selectedCartItem);
      this.cart.set([...this.cart()]);
      this.calculateCartTotals();
    }
    this.showModifiersDialog = false;
    this.selectedCartItem = null;
    this.selectedModifiers = [];
  }

  /**
   * Hold Order Feature
   */
  openHoldDialog(): void {
    if (this.cart().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_POS.CART_EMPTY')
      });
      return;
    }
    this.holdOrderName = this.customerName || `طلب #${this.heldOrders().length + 1}`;
    this.showHoldConfirmDialog = true;
  }

  confirmHoldOrder(): void {
    const session = this.currentSession();
    if (!session?.id || !session.storeDetailsId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.NO_SESSION'),
        detail: this.translateService.instant('CASHIER_POS.PLEASE_OPEN_SESSION_DETAIL')
      });
      return;
    }

    const cartSnapshot = this.cloneCart(this.cart());
    const payload = this.buildHeldOrderPayload(session, cartSnapshot);

    this.heldOrdersLoading.set(true);
    this.cashierService.createHeldOrder(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const heldOrder = this.mapHeldOrder(response, {
            id: `${response?.id ?? response?.data?.id ?? Date.now()}`,
            name: payload.customerName,
            customerName: payload.customerName,
            time: new Date(),
            cart: cartSnapshot
          });

          this.heldOrders.update(orders => {
            const updated = [heldOrder, ...orders.filter(order => order.id !== heldOrder.id)];
            this.syncHeldOrdersStorage(updated);
            return updated;
          });
          this.heldOrdersLoading.set(false);
          this.showHoldConfirmDialog = false;
          this.clearCart();

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('CASHIER_POS.SUCCESS'),
            detail: this.translateService.instant('CASHIER_POS.ORDER_HELD_SUCCESS')
          });
        },
        error: (error) => {
          this.heldOrdersLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.WARNING'),
            detail: mapError(error, 'Failed to save held order on backend.')
          });
        }
      });
  }

  openHeldOrdersList(): void {
    this.loadHeldOrders(true);
    this.showHeldOrdersDialog = true;
  }

  restoreHeldOrder(orderId: string): void {
    const orderToRestore = this.heldOrders().find(o => o.id === orderId);
    if (!orderToRestore) return;

    if (this.cart().length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_POS.CLEAR_OR_HOLD_CART_FIRST')
      });
      return;
    }

    this.cart.set(this.cloneCart(orderToRestore.cart));
    this.customerName = orderToRestore.name;
    this.calculateCartTotals();

    this.heldOrdersLoading.set(true);
    this.cashierService.deleteHeldOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.heldOrders.update(orders => {
            const updated = orders.filter(o => o.id !== orderId);
            this.syncHeldOrdersStorage(updated);
            return updated;
          });
          this.heldOrdersLoading.set(false);
          this.showHeldOrdersDialog = false;

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('CASHIER_POS.SUCCESS'),
            detail: this.translateService.instant('CASHIER_POS.ORDER_RESTORED')
          });
        },
        error: (error) => {
          this.heldOrdersLoading.set(false);
          this.messageService.add({
            severity: 'warn',
            summary: this.translateService.instant('CASHIER_POS.WARNING'),
            detail: mapError(error, 'Held order restored locally, but backend delete failed.')
          });
        }
      });
  }

  deleteHeldOrder(orderId: string): void {
    this.heldOrdersLoading.set(true);
    this.cashierService.deleteHeldOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.heldOrders.update(orders => {
            const updated = orders.filter(o => o.id !== orderId);
            this.syncHeldOrdersStorage(updated);
            return updated;
          });
          this.heldOrdersLoading.set(false);
        },
        error: (error) => {
          this.heldOrdersLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.WARNING'),
            detail: mapError(error, 'Failed to delete held order on backend.')
          });
        }
      });
  }

  private syncHeldOrdersStorage(orders: CashierHeldOrder[]): void {
    const session = this.currentSession();
    if (session?.id) {
      localStorage.setItem(`pos_held_orders_${session.id}`, JSON.stringify(orders));
    }
  }

  loadStoreOptions(): void {
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        const lang = this.translateService.currentLang || 'ar';
        const isAr = lang !== 'en';
        
        let filteredStores = stores.filter(store => store.isActive && !!store.id);
        const hasPharmacyPerm = this.authService.hasPermission('Cashier.Pharmacy');
        const hasPosPerm = this.authService.hasPermission('Cashier.POS');
        const isDevOrAdmin = this.authService.hasPermission('System.Admin') || this.authService.hasPermission('System.Developer');

        if (!isDevOrAdmin) {
          if (hasPharmacyPerm && !hasPosPerm) {
            filteredStores = filteredStores.filter(s => 
              isPharmacyStore(s) || 
              (s.arabicName && (s.arabicName.includes('صيدل') || s.arabicName.toLowerCase().includes('pharmacy'))) ||
              (s.englishName && s.englishName.toLowerCase().includes('pharmacy'))
            );
          } else if (hasPosPerm && !hasPharmacyPerm) {
            filteredStores = filteredStores.filter(s => 
              !isPharmacyStore(s) && 
              !(s.arabicName && (s.arabicName.includes('صيدل') || s.arabicName.toLowerCase().includes('pharmacy'))) &&
              !(s.englishName && s.englishName.toLowerCase().includes('pharmacy'))
            );
          }
        }

        this.allStoreOptions = filteredStores.map(s => ({
          label: isAr ? (s.arabicName || s.englishName || s.id!) : (s.englishName || s.arabicName || s.id!),
          value: s.id!
        })).sort((a, b) => a.label.localeCompare(b.label, isAr ? 'ar' : 'en'));
      }
    });
  }

  openEditSessionStoresDialog(): void {
    const session = this.currentSession();
    if (!session || !session.id) return;
    const stored = localStorage.getItem(`cashier_session_stores_${session.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.editSessionStoreIds = Array.isArray(parsed) ? parsed : (session.storeDetailsId ? [session.storeDetailsId] : []);
      } catch {
        this.editSessionStoreIds = session.storeDetailsId ? [session.storeDetailsId] : [];
      }
    } else {
      this.editSessionStoreIds = session.storeDetailsId ? [session.storeDetailsId] : [];
    }

    this.loadStoreOptions();
    this.showEditStoresDialog = true;
  }

  saveEditedSessionStores(): void {
    const session = this.currentSession();
    if (!session || !session.id) return;
    if (!this.editSessionStoreIds || this.editSessionStoreIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يجب اختيار مخزن واحد على الأقل للوردية.'
      });
      return;
    }

    localStorage.setItem(`cashier_session_stores_${session.id}`, JSON.stringify(this.editSessionStoreIds));
    this.selectedStoreIds = [...this.editSessionStoreIds];
    this.sessionStores = this.allStoreOptions.filter(s => this.editSessionStoreIds.includes(s.value));
    if (!this.sessionStores.some(s => s.value === this.activeStoreId) && this.sessionStores.length > 0) {
      this.activeStoreId = this.sessionStores[0].value;
    }
    this.showEditStoresDialog = false;
    this.loadProducts();
    this.messageService.add({
      severity: 'success',
      summary: 'تم الحفظ',
      detail: 'تم تحديث قائمة مخازن الوردية وتحميل الأصناف بنجاح.'
    });
  }

  getSelectedStoreNames(): string[] {
    if (!this.editSessionStoreIds || this.editSessionStoreIds.length === 0) return [];
    return this.editSessionStoreIds
      .map(id => this.allStoreOptions.find(opt => opt.value === id)?.label)
      .filter((name): name is string => !!name);
  }

  private loadHeldOrders(showEmptyToast = false): void {
    const session = this.currentSession();
    if (!session?.id || !session.storeDetailsId) {
      this.heldOrders.set([]);
      return;
    }

    this.heldOrdersLoading.set(true);
    this.cashierService.getHeldOrders({
      storeDetailsId: session.storeDetailsId,
      sessionId: session.id,
      terminalId: this.getTerminalId(session)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          const mappedOrders = (orders || []).map(order => this.mapHeldOrder(order));
          this.heldOrders.set(mappedOrders);
          this.syncHeldOrdersStorage(mappedOrders);
          this.heldOrdersLoading.set(false);

          if (showEmptyToast && mappedOrders.length === 0) {
            this.messageService.add({
              severity: 'info',
              summary: this.translateService.instant('CASHIER_POS.INFO'),
              detail: this.translateService.instant('CASHIER_POS.NO_HELD_ORDERS')
            });
          }
        },
        error: (error) => {
          this.heldOrders.set([]);
          this.heldOrdersLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.WARNING'),
            detail: mapError(error, 'Failed to load held orders from backend.')
          });
        }
      });
  }

  private buildHeldOrderPayload(session: CashierSession, cart: CartItem[]): CashierHeldOrderRequest {
    return {
      storeDetailsId: session.storeDetailsId!,
      terminalId: this.getTerminalId(session),
      sessionId: session.id!,
      customerName: this.holdOrderName?.trim() || this.customerName?.trim() || `Order #${this.heldOrders().length + 1}`,
      notes: '',
      totalAmount: this.cartTotal(),
      lines: cart.map(item => ({
        productId: `${item.itemId}`,
        productUnitId: item.unitId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.taxPercentage,
        vatAmount: item.taxAmount,
        totalAmount: item.totalAmount,
        itemName: item.itemName,
        itemCode: item.itemCode
      }))
    };
  }

  private mapHeldOrder(source: any, fallback?: CashierHeldOrder): CashierHeldOrder {
    const body = source?.data ?? source?.result ?? source ?? {};
    const lines = Array.isArray(body.lines)
      ? body.lines
      : Array.isArray(body.items)
        ? body.items
        : Array.isArray(body.cart)
          ? body.cart
          : [];

    const fallbackCart = fallback?.cart || [];
    const cart = lines.length ? lines.map((line: any) => this.mapHeldOrderLineToCartItem(line)) : this.cloneCart(fallbackCart);
    const name = `${body.customerName ?? body.name ?? body.heldName ?? fallback?.name ?? 'Held order'}`;

    return {
      id: `${body.id ?? body.heldOrderId ?? fallback?.id ?? Date.now()}`,
      name,
      customerName: name,
      time: new Date(body.heldAt ?? body.createdAt ?? body.time ?? fallback?.time ?? Date.now()),
      cart,
      raw: source
    };
  }

  private mapHeldOrderLineToCartItem(line: any): CartItem {
    const quantity = Number(line.quantity ?? line.qty ?? 0);
    const unitPrice = Number(line.unitPrice ?? line.price ?? 0);
    const taxPercentage = Number(line.vatRate ?? line.taxPercentage ?? line.taxRate ?? 0);
    const taxAmount = Number(line.vatAmount ?? line.taxAmount ?? 0);
    const totalAmount = Number(line.totalAmount ?? line.total ?? ((quantity * unitPrice) + taxAmount));
    const rawItemId = Number(line.itemId ?? line.productId ?? line.product?.id ?? 0);

    return {
      itemId: Number.isFinite(rawItemId) ? rawItemId : 0,
      itemCode: `${line.itemCode ?? line.code ?? line.productCode ?? ''}`,
      itemName: `${line.itemName ?? line.name ?? line.productName ?? '-'}`,
      itemBarcode: line.itemBarcode ?? line.barcode,
      quantity,
      unitPrice,
      discountPercentage: Number(line.discountPercentage ?? 0),
      discountAmount: Number(line.discountAmount ?? 0),
      taxPercentage,
      taxAmount,
      totalAmount,
      unitId: line.productUnitId ?? line.unitId ?? undefined,
      unitName: line.unitName ?? line.unit ?? undefined
    };
  }

  private cloneCart(cart: CartItem[]): CartItem[] {
    return cart.map(item => ({
      ...item,
      modifiers: item.modifiers ? item.modifiers.map(modifier => ({ ...modifier })) : undefined,
      prescriptionMeta: item.prescriptionMeta ? { ...item.prescriptionMeta } : undefined
    }));
  }

  private getTerminalId(session: CashierSession): string {
    return session.terminalId || session.sessionNumber || 'POS-01';
  }

  /**
   * Custom Discount Feature
   */
  openCustomDiscountDialog(): void {
    const items = this.cart();
    if (items.length === 0) return;
    this.customDiscountType = 'amount';
    this.customDiscountValue = 0;

    let minAllowedSubtotal = 0;
    const currentSubtotal = items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice + (item.modifiersTotal || 0))), 0);

    for (const item of items) {
      if (item.costPrice !== undefined && item.costPrice !== null && item.costPrice > 0) {
        minAllowedSubtotal += item.costPrice * item.quantity;
      }
    }

    this.maxAllowedDiscountAmount = Math.max(0, currentSubtotal - minAllowedSubtotal);
    const maxDiscountPercent = currentSubtotal > 0 ? (this.maxAllowedDiscountAmount / currentSubtotal) * 100 : 0;
    this.maxAllowedDiscountPercent = Math.floor(maxDiscountPercent * 100) / 100;
    this.showCustomDiscountDialog = true;
  }

  applyCustomDiscount(): void {
    if (this.customDiscountValue <= 0) {
      this.showCustomDiscountDialog = false;
      return;
    }

    const items = [...this.cart()];
    const currentSubtotal = items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice + (item.modifiersTotal || 0))), 0);

    if (currentSubtotal <= 0) {
      this.showCustomDiscountDialog = false;
      return;
    }

    // Calculate profit margin and max discount allowed per item
    let minAllowedSubtotal = 0;

    const itemMargins = items.map(item => {
      const effectiveUnitPrice = item.unitPrice + (item.modifiersTotal || 0);
      const itemSubtotal = item.quantity * effectiveUnitPrice;
      const hasCost = item.costPrice !== undefined && item.costPrice !== null && item.costPrice > 0;
      const itemCost = hasCost ? (item.costPrice! * item.quantity) : 0;
      const maxDiscount = Math.max(0, itemSubtotal - itemCost);
      minAllowedSubtotal += itemCost;

      return {
        item,
        itemSubtotal,
        maxDiscount
      };
    });

    const maxAllowedDiscountAmount = Math.max(0, currentSubtotal - minAllowedSubtotal);
    const maxDiscountPercent = currentSubtotal > 0 ? (maxAllowedDiscountAmount / currentSubtotal) * 100 : 0;

    let requestedAmount = 0;
    if (this.customDiscountType === 'percent') {
      const requestedPercent = this.customDiscountValue;
      requestedAmount = (requestedPercent / 100) * currentSubtotal;
      if (requestedAmount > maxAllowedDiscountAmount + 0.05) {
        this.messageService.add({
          severity: 'error',
          summary: 'تجاوز حد الخصم المسموح',
          detail: `نسبة الخصم المطلوبة (${requestedPercent.toFixed(2)}%) تتجاوز الحد الأقصى المتاح (${maxDiscountPercent.toFixed(2)}%) للحفاظ على سعر الشراء.`,
          life: 6000
        });
        return;
      }
    } else {
      requestedAmount = this.customDiscountValue;
      if (requestedAmount > maxAllowedDiscountAmount + 0.01) {
        this.messageService.add({
          severity: 'error',
          summary: 'تجاوز حد الخصم المسموح',
          detail: `الخصم المطلوب (${requestedAmount.toFixed(2)} ر.س) يتجاوز الحد الأقصى المتاح للفاتورة (${maxAllowedDiscountAmount.toFixed(2)} ر.س) للحفاظ على سعر الشراء.`,
          life: 6000
        });
        return;
      }
    }

    if (maxAllowedDiscountAmount > 0) {
      itemMargins.forEach(m => {
        const itemDiscountAmount = (m.maxDiscount / maxAllowedDiscountAmount) * requestedAmount;
        m.item.discountPercentage = m.itemSubtotal > 0 ? (itemDiscountAmount / m.itemSubtotal) * 100 : 0;
        this.updateItemTotal(m.item);
      });
    }

    this.cart.set(items);
    this.calculateCartTotals();
    this.showCustomDiscountDialog = false;
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_POS.SUCCESS'),
      detail: this.translateService.instant('CASHIER_POS.DISCOUNT_APPLIED')
    });
  }

  /**
   * Remove item from cart
   */
  removeFromCart(item: CartItem): void {
    const currentCart = this.cart().filter(i => i.itemId !== item.itemId);
    this.cart.set(currentCart);
    this.calculateCartTotals();
  }

  /**
   * Update item total calculation
   */
  private updateItemTotal(item: CartItem): void {
    // Add modifiers to unit price for subtotal calculation
    const effectiveUnitPrice = item.unitPrice + (item.modifiersTotal || 0);
    const subtotal = item.quantity * effectiveUnitPrice;

    item.discountAmount = (subtotal * item.discountPercentage) / 100;
    const afterDiscount = subtotal - item.discountAmount;
    item.taxAmount = (afterDiscount * item.taxPercentage) / 100;
    item.totalAmount = afterDiscount + item.taxAmount;
  }

  /**
   * Calculate cart totals
   */
  private calculateCartTotals(): void {
    const items = this.cart();

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const tax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = items.reduce((sum, item) => sum + item.totalAmount, 0);

    this.cartSubtotal.set(subtotal);
    this.cartDiscount.set(discount);
    this.cartTax.set(tax);
    this.cartTotal.set(total);
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this.cart.set([]);
    this.calculateCartTotals();
    this.customerName = '';
    this.customerPhone = '';
    this.selectedCustomerId = null;
    this.selectedCustomer = null;
  }

  confirmClearCart(): void {
    this.confirmationService.confirm({
      header: 'Confirm Delete',
      message: 'Clear all items from the cart?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.clearCart()
    });
  }

  confirmRemoveFromCart(item: CartItem): void {
    this.confirmationService.confirm({
      header: 'Confirm Delete',
      message: `Remove ${item.itemName} from the cart?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.removeFromCart(item)
    });
  }

  confirmDeleteHeldOrder(orderId: string): void {
    this.confirmationService.confirm({
      header: 'Confirm Delete',
      message: 'Delete this held order?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteHeldOrder(orderId)
    });
  }

  /**
   * Open payment dialog
   */
  openPaymentDialog(): void {
    if (this.cart().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.EMPTY_CART'),
        detail: this.translateService.instant('CASHIER_POS.ADD_ITEMS_FIRST')
      });
      return;
    }

    if (!this.currentSession()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.NO_SESSION'),
        detail: this.translateService.instant('CASHIER_POS.PLEASE_OPEN_SESSION_DETAIL')
      });
      return;
    }

    if (!this.currentSession()?.storeDetailsId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.STORE_NOT_SELECTED'),
        detail: this.translateService.instant('CASHIER_POS.STORE_LINK_REQUIRED')
      });
      return;
    }

    this.paidAmount = this.getPaymentDueAmount();
    if (this.paymentMethod === PaymentMethod.Mixed) {
      this.initMixedPaymentAmounts();
    }
    this.calculateChange();
    this.checkoutIdempotencyKey = this.cashierService.generateUUID();
    this.showPaymentDialog = true;
  }

  initMixedPaymentAmounts(): void {
    this.mixedCashAmount = null as any;
    this.mixedCardAmount = null as any;
    this.mixedOtherAmount = null as any;
  }

  onMixedAmountChange(): void {
    // reactive update
  }

  getMixedTotal(): number {
    return Math.round(((this.mixedCashAmount || 0) + (this.mixedCardAmount || 0) + (this.mixedOtherAmount || 0)) * 100) / 100;
  }

  isMixedPaymentBalanced(): boolean {
    const due = Math.round(this.getPaymentDueAmount() * 100) / 100;
    return Math.abs(this.getMixedTotal() - due) <= 0.01;
  }

  confirmCompleteTransaction(printAfterPayment = false): void {
    this.completeTransaction(printAfterPayment);
  }

  /**
   * Calculate change amount
   */
  calculateChange(): void {
    this.changeAmount = Math.max(0, this.paidAmount - this.getPaymentDueAmount());
  }

  /**
   * Process payment and complete transaction
   */
  completeTransaction(printAfterPayment = false): void {
    if (this.paymentMethod === PaymentMethod.Mixed) {
      if (!this.isMixedPaymentBalanced()) {
        const diff = (this.getPaymentDueAmount() - this.getMixedTotal()).toFixed(2);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ في الدفع المختلط',
          detail: `مجموع طرق الدفع (${this.getMixedTotal().toFixed(2)}) لا يساوي إجمالي الفاتورة (${this.getPaymentDueAmount().toFixed(2)}). الفارق: ${diff} ر.س`
        });
        return;
      }
    } else if (this.paidAmount < this.getPaymentDueAmount() && this.paymentMethod !== PaymentMethod.Credit) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('CASHIER_POS.INSUFFICIENT_PAYMENT'),
        detail: this.translateService.instant('CASHIER_POS.PAID_LESS_THAN_TOTAL')
      });
      return;
    }

    const currentSession = this.currentSession();
    if (!currentSession?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.NO_SESSION'),
        detail: this.translateService.instant('CASHIER_POS.PLEASE_OPEN_SESSION_DETAIL')
      });
      return;
    }

    if (!currentSession.storeDetailsId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.STORE_NOT_SELECTED'),
        detail: this.translateService.instant('CASHIER_POS.STORE_LINK_REQUIRED')
      });
      return;
    }

    // Close payment modal immediately while checkout progress layer runs smoothly in background
    this.showPaymentDialog = false;

    if (this.hasPrescriptionItemsInCart()) {
      if (!this.isPrescriptionOnlyCart()) {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_POS.WARNING'),
          detail: 'Prescription checkout cannot be mixed with retail items.'
        });
        return;
      }

      const pickupId = getSinglePharmacyPickupIdForCheckout(this.cart());
      if (!pickupId) {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_POS.WARNING'),
          detail: 'This prescription cart is missing the pickup reference required for checkout.'
        });
        return;
      }

      this.completePrescriptionTransaction(currentSession, pickupId, printAfterPayment);
      return;
    }

    this.completeRetailTransaction(currentSession, printAfterPayment);
  }

  paymentDueAmount(): number {
    return this.getPaymentDueAmount();
  }

  hasInsuranceAdjustedPaymentDue(): boolean {
    return Math.abs(this.cartTotal() - this.getPaymentDueAmount()) > 0.009;
  }

  private completePrescriptionTransaction(
    currentSession: CashierSession,
    pickupId: string,
    printAfterPayment: boolean
  ): void {
    this.checkoutLoading.set(true);
    this.pharmacySupportApiService.checkoutPrescription({
      pickupId,
      cashierSessionId: String(currentSession.id),
      storeDetailsId: currentSession.storeDetailsId!,
      paymentMethod: this.getPharmacyCheckoutPaymentMethod(),
      cashAmount: this.getCashPortionForPharmacyCheckout(),
      cardAmount: this.getCardPortionForPharmacyCheckout(),
      notes: ''
    }).subscribe({
      next: (response) => {
        if (!response.success) {
          this.checkoutLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.CHECKOUT'),
            detail: response.error || 'Failed to complete prescription checkout.'
          });
          return;
        }

        this.finalizeSuccessfulTransaction({
          invoiceNo: response.invoiceNo,
          invoiceId: response.invoiceId,
          paidAmount: this.getPaymentDueAmount(),
          changeAmount: response.changeAmount ?? this.changeAmount,
          successDetail: 'Prescription delivered and invoice created successfully.',
          printAfterPayment,
          refreshReadyQueue: true
        });
      },
      error: (error) => {
        this.checkoutLoading.set(false);
        if (error.status === 403 && error.error?.errorCode === 'NO_ACTIVE_SESSION') {
          this.loadCurrentSession();
        }
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_POS.CHECKOUT'),
          detail: mapError(error, 'Failed to complete prescription checkout.')
        });
      }
    });
  }

  private completeRetailTransaction(currentSession: CashierSession, printAfterPayment: boolean): void {
    this.checkoutLoading.set(true);

    const invoicePayload = this.buildInvoicePayload(currentSession.id);
    this.cashierService.checkout(invoicePayload as any, this.checkoutIdempotencyKey || undefined).subscribe({
      next: (checkoutResponse: any) => {
        const invoiceId = checkoutResponse?.id || checkoutResponse?.invoiceId;
        if (invoiceId) {
          const restaurantItems = this.cart().map(item => ({
            itemId: item.itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxPercentage: item.taxPercentage,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount
          }));
          if (this.isRestaurantMode) {
            if (this.orderType === OrderType.DineIn && this.selectedTableId) {
              this.restaurantModeService.createCashierDineInOrder(
                invoiceId,
                this.selectedTableId,
                restaurantItems,
                this.customerName
              );
            } else {
              this.restaurantModeService.createPosOrder(
                invoiceId,
                this.orderType,
                this.customerName,
                restaurantItems,
                this.cartSubtotal(),
                this.cartTax(),
                this.cartTotal()
              );
            }
          }
        }

        this.finalizeSuccessfulTransaction({
          invoiceNo: checkoutResponse?.invoiceNo,
          invoiceId: invoiceId,
          paidAmount: checkoutResponse?.paidAmount ?? this.paidAmount,
          changeAmount: checkoutResponse?.changeAmount ?? this.changeAmount,
          successDetail: this.translateService.instant('CASHIER_POS.INVOICE_SAVED'),
          printAfterPayment
        });
      },
      error: (error) => {
        this.checkoutLoading.set(false);

        if (error.status === 403 && error.error?.errorCode === 'NO_ACTIVE_SESSION') {
          this.messageService.add({
            severity: 'warn',
            summary: this.translateService.instant('CASHIER_POS.NO_ACTIVE_SESSION'),
            detail: mapError(error, this.translateService.instant('CASHIER_POS.NO_ACTIVE_SESSION_MSG'))
          });
          this.loadCurrentSession();
          return;
        }

        if (error.status === 403 && error.error?.errorCode === 'SESSION_NO_STORE') {
          this.messageService.add({
            severity: 'warn',
            summary: this.translateService.instant('CASHIER_POS.SESSION_WITHOUT_STORE'),
            detail: mapError(error, this.translateService.instant('CASHIER_POS.SESSION_WITHOUT_STORE_MSG'))
          });
          return;
        }

        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_POS.INVOICE_FAILED'),
          detail: error.error?.messageAr || error.error?.message || mapError(error, this.translateService.instant('CASHIER_POS.UNABLE_TO_CREATE_INVOICE'))
        });
      }
    });
  }

  private getResolvedCustomerInfo(): {
    customerId: string | null;
    customerName: string;
    customerPhone: string | null;
    customerTaxNumber: string | null;
  } {
    let custId: string | null = this.selectedCustomerId || null;
    let custName = (this.customerName || '').trim();
    let custPhone = (this.customerPhone || '').trim() || null;
    let custTax: string | null = null;

    if (this.selectedCustomer && typeof this.selectedCustomer === 'object') {
      custId = this.selectedCustomer.id || custId;
      custName = (this.selectedCustomer.arabicName || this.selectedCustomer.englishName || custName).trim();
      custTax = (this.selectedCustomer.taxNumber || '').trim() || null;
      if (!custPhone) {
        custPhone = (this.selectedCustomer.contactNumber || this.selectedCustomer.additionalContactNumber || '').trim() || null;
      }
    } else if (typeof this.selectedCustomer === 'string' && this.selectedCustomer.trim()) {
      custName = this.selectedCustomer.trim();
      const match = this.customerProfiles.find(c =>
        (c.arabicName && c.arabicName.trim().toLowerCase() === custName.toLowerCase()) ||
        (c.englishName && c.englishName.trim().toLowerCase() === custName.toLowerCase())
      );
      if (match) {
        custId = match.id || null;
        custTax = (match.taxNumber || '').trim() || null;
        if (!custPhone && match.contactNumber) {
          custPhone = match.contactNumber.trim();
        }
      }
    } else if (custName) {
      const match = this.customerProfiles.find(c =>
        (c.arabicName && c.arabicName.trim().toLowerCase() === custName.toLowerCase()) ||
        (c.englishName && c.englishName.trim().toLowerCase() === custName.toLowerCase())
      );
      if (match) {
        custId = match.id || null;
        custTax = (match.taxNumber || '').trim() || null;
        if (!custPhone && match.contactNumber) {
          custPhone = match.contactNumber.trim();
        }
      }
    }

    return {
      customerId: custId,
      customerName: custName,
      customerPhone: custPhone,
      customerTaxNumber: custTax
    };
  }

  private buildInvoicePayload(sessionId: number): Record<string, unknown> {
    const subtotal = this.cartSubtotal();
    const discount = this.cartDiscount();
    const tax = this.cartTax();
    const total = this.cartTotal();
    const taxableBase = Math.max(0, subtotal - discount);

    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const taxPercent = taxableBase > 0 ? (tax / taxableBase) * 100 : 0;

    const resolved = this.getResolvedCustomerInfo();
    const fallbackName = this.translateService.instant('CASHIER_POS.WALK_IN_CUSTOMER') || 'Walk-in Customer';

    return {
      invoiceDate: new Date(),
      cashierSessionId: sessionId,
      storeDetailsId: this.activeStoreId || this.currentSession()?.storeDetailsId || null,
      customerId: resolved.customerId,
      customerName: resolved.customerName || fallbackName,
      customerPhone: resolved.customerPhone,
      customerTaxNumber: resolved.customerTaxNumber,
      items: this.cart().map(item => ({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        taxPercentage: item.taxPercentage,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
        pharmacyPickupId: item.prescriptionMeta?.pickupId ?? null,
        pharmacyPrescriptionId: item.prescriptionMeta?.prescriptionId ?? null,
        pharmacyPrescriptionItemId: item.prescriptionMeta?.prescriptionItemId ?? null,
        catalogItemId: item.prescriptionMeta?.catalogItemId ?? null,
        batchNo: item.prescriptionMeta?.batchNo ?? null,
        expiryDate: item.prescriptionMeta?.expiryDate ?? null,
        patientShare: item.prescriptionMeta?.patientShare ?? null,
        insuranceShare: item.prescriptionMeta?.insuranceShare ?? null
      })),
      subtotal,
      discountPercentage: discountPercent,
      discountAmount: discount,
      taxPercentage: taxPercent,
      taxAmount: tax,
      totalAmount: total,
      paymentMethod: this.paymentMethod,
      paidAmount: this.paidAmount,
      changeAmount: this.changeAmount,
      cashAmount: this.paymentMethod === PaymentMethod.Mixed ? (this.mixedCashAmount || 0) : (this.paymentMethod === PaymentMethod.Cash ? this.paidAmount : 0),
      cardAmount: this.paymentMethod === PaymentMethod.Mixed ? (this.mixedCardAmount || 0) : (this.paymentMethod === PaymentMethod.Card ? total : 0),
      otherAmount: this.paymentMethod === PaymentMethod.Mixed ? (this.mixedOtherAmount || 0) : 0,
      notes: resolved.customerName || ''
    };
  }

  private buildPaymentPayload(invoiceId: number): Record<string, unknown> {
    const total = this.cartTotal();
    const paymentDue = this.getPaymentDueAmount();
    const pharmacyPrescriptionId = getSinglePharmacyPrescriptionIdForPayment(this.cart());
    const payload: Record<string, unknown> = {
      invoiceId,
      totalAmount: total,
      paymentMethod: this.paymentMethod
    };

    if (pharmacyPrescriptionId) {
      payload['pharmacyPrescriptionId'] = pharmacyPrescriptionId;
    }

    if (this.paymentMethod === PaymentMethod.Cash) {
      payload['cashAmount'] = this.paidAmount;
      return payload;
    }

    if (this.paymentMethod === PaymentMethod.Card || this.paymentMethod === PaymentMethod.BankTransfer) {
      payload['cardAmount'] = paymentDue;
      return payload;
    }

    if (this.paymentMethod === PaymentMethod.Credit) {
      payload['creditDays'] = 30;
      return payload;
    }

    if (this.paymentMethod === PaymentMethod.Mixed) {
      payload['cashAmount'] = this.mixedCashAmount || 0;
      payload['cardAmount'] = this.mixedCardAmount || 0;
      payload['otherAmount'] = this.mixedOtherAmount || 0;
      return payload;
    }

    const mixedCash = Math.max(0, Math.min(this.paidAmount, paymentDue));
    const mixedCard = Math.max(0, paymentDue - mixedCash);
    payload['cashAmount'] = mixedCash;
    payload['cardAmount'] = mixedCard;
    return payload;
  }

  getPaymentDueAmount(): number {
    const patientShare = getCartPatientShareTotal(this.cart());
    return patientShare != null ? patientShare : this.cartTotal();
  }

  private finalizeSuccessfulTransaction(options: {
    invoiceNo?: string;
    invoiceId?: string | number;
    paidAmount?: number;
    changeAmount?: number;
    successDetail: string;
    printAfterPayment: boolean;
    refreshReadyQueue?: boolean;
  }): void {
    if (options.invoiceId) {
      this.lastCheckoutInvoiceId = Number(options.invoiceId);
    }
    this.lastReceipt.set(this.buildReceiptFromCart({
      invoiceNo: options.invoiceNo,
      paidAmount: options.paidAmount,
      changeAmount: options.changeAmount
    }));
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_POS.TRANSACTION_COMPLETED'),
      detail: options.successDetail
    });

    this.showPaymentDialog = false;
    this.clearCart();
    this.checkoutIdempotencyKey = null;
    this.loading.set(false);
    this.checkoutLoading.set(false);
    this.loadProducts();
    this.loadCurrentSession();
    this.loadCustomers();

    if (options.refreshReadyQueue) {
      this.loadReadyPrescriptions();
    }

    // Trigger electronic cash drawer pulse on payment confirmation / print
    try {
      this.cashDrawerService.openDrawer(this.currentSession()?.id);
    } catch (e) {
      console.warn('Could not trigger cash drawer pulse', e);
    }

    if (options.printAfterPayment) {
      setTimeout(() => void this.printCustomerReceipt(), 0);
    }
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels = {
      [PaymentMethod.Cash]: this.translateService.instant('CASHIER_POS.CASH_LABEL'),
      [PaymentMethod.Card]: this.translateService.instant('CASHIER_POS.CARD_LABEL'),
      [PaymentMethod.Credit]: this.translateService.instant('CASHIER_POS.CREDIT_LABEL'),
      [PaymentMethod.Mixed]: this.translateService.instant('CASHIER_POS.MIXED_LABEL'),
      [PaymentMethod.BankTransfer]: this.translateService.instant('CASHIER_POS.BANK_TRANSFER_LABEL')
    };
    return labels[method] || 'Cash';
  }

  async printCustomerReceipt(printType?: string): Promise<void> {
    const selectedType = printType || this.selectedCheckoutPrintType || 'Thermal80mm';
    if (this.lastCheckoutInvoiceId) {
      this.salesInvoiceService.printDocument(this.lastCheckoutInvoiceId, selectedType);
      return;
    }

    const receipt = this.lastReceipt();
    if (!receipt) {
      return;
    }

    const popup = window.open('', '_blank', 'width=420,height=860');
    if (!popup) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.PRINT_BLOCKED'),
        detail: this.translateService.instant('CASHIER_POS.ALLOW_POPUPS_MSG')
      });
      return;
    }

    const qrImageDataUrl = await this.generateQrDataUrl(receipt.qrPayload || '');
    popup.document.write(this.buildPrintableReceiptHtml(receipt, this.selectedReceiptTemplateId(), qrImageDataUrl));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  get selectedReceiptTemplateLabel(): string {
    return this.receiptTemplateService.getTemplateLabel(this.selectedReceiptTemplateId());
  }

  private buildReceiptFromCart(overrides?: {
    invoiceNo?: string;
    paidAmount?: number;
    changeAmount?: number;
  }): CashierReceiptData {
    const now = new Date();
    const items = this.cart().map(item => ({
      name: item.itemName,
      qty: item.quantity,
      unitPrice: item.unitPrice,
      total: item.totalAmount
    }));

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const discount = this.cart().reduce((sum, item) => sum + item.discountAmount, 0);
    const tax = this.cart().reduce((sum, item) => sum + item.taxAmount, 0);
    const total = this.cart().reduce((sum, item) => sum + item.totalAmount, 0);
    const amountDue = this.getPaymentDueAmount();
    const paidAmount = overrides?.paidAmount ?? (this.paymentMethod === PaymentMethod.Cash ? this.paidAmount : amountDue);
    const cashierName = this.currentSession()?.cashierUserName || 'Cashier User';
    const stationName = this.currentSession()?.sessionNumber || 'POS-01';
    const resolved = this.getResolvedCustomerInfo();
    const customer = resolved.customerName || this.translateService.instant('CASHIER_POS.CASH_CUSTOMER');

    const comp = this.companyDetails();
    const isAr = (this.translateService.currentLang || 'ar').startsWith('ar');
    const compName = comp ? (isAr ? (comp.arabicName || comp.englishName) : (comp.englishName || comp.arabicName)) : 'SMART & PRO';
    const compAddress = comp ? (comp.address?.street || comp.street || comp.district || comp.city || '') : '';
    const compTaxNumber = comp?.taxNumber || '';
    const compPhone = comp?.phones?.[0]?.phoneNumber || comp?.phone || '';
    const compLogoUrl = comp?.logoUrl || '';

    const custTaxNumber = resolved.customerTaxNumber || '';

    const receipt: CashierReceiptData = {
      invoiceNo: overrides?.invoiceNo || `TMP-${now.getTime().toString().slice(-6)}`,
      invoiceDate: now,
      cashierName,
      stationName,
      customerName: customer,
      customerTaxNumber: custTaxNumber || undefined,
      paymentLabel: this.getPaymentMethodLabel(this.paymentMethod),
      companyName: compName,
      companyLogoUrl: compLogoUrl,
      companyTaxNumber: compTaxNumber,
      companyAddress: compAddress,
      companyPhone: compPhone,
      subtotal,
      discount,
      tax,
      total,
      paidAmount,
      changeAmount: overrides?.changeAmount ?? (this.paymentMethod === PaymentMethod.Cash ? Math.max(0, paidAmount - amountDue) : 0),
      isMixedPayment: this.paymentMethod === PaymentMethod.Mixed,
      mixedCashAmount: this.paymentMethod === PaymentMethod.Mixed ? (this.mixedCashAmount || 0) : undefined,
      mixedCardAmount: this.paymentMethod === PaymentMethod.Mixed ? (this.mixedCardAmount || 0) : undefined,
      mixedOtherAmount: this.paymentMethod === PaymentMethod.Mixed ? (this.mixedOtherAmount || 0) : undefined,
      footerNote: 'نسخة تجريبية قبل ربط الباك اند',
      items,
      vatRatePercent: 15,
      zatcaQrPlaceholder: true,
      zatcaReadinessNote: 'ZATCA Phase 1/2 — مساحة QR الرسمية (بدون TLV حتى ربط البوابة)'
    };

    receipt.qrPayload = this.buildQrPayload(receipt);
    return receipt;
  }

  private hasPrescriptionItemsInCart(): boolean {
    return this.cart().some((item) => !!item.prescriptionMeta?.prescriptionId);
  }

  private hasRetailItemsInCart(): boolean {
    return this.cart().some((item) => !item.prescriptionMeta?.prescriptionId);
  }

  private isPrescriptionOnlyCart(): boolean {
    return this.hasPrescriptionItemsInCart() && !this.hasRetailItemsInCart();
  }

  private getPharmacyCheckoutPaymentMethod(): string {
    switch (this.paymentMethod) {
      case PaymentMethod.Card:
        return 'CARD';
      case PaymentMethod.Credit:
        return 'CREDIT';
      case PaymentMethod.Mixed:
        return 'MIXED';
      case PaymentMethod.BankTransfer:
        return 'BANK_TRANSFER';
      default:
        return 'CASH';
    }
  }

  private getCashPortionForPharmacyCheckout(): number | undefined {
    const paymentDue = this.getPaymentDueAmount();
    if (this.paymentMethod === PaymentMethod.Cash) {
      return this.paidAmount;
    }
    if (this.paymentMethod === PaymentMethod.Mixed) {
      return Math.max(0, Math.min(this.paidAmount, paymentDue));
    }
    return undefined;
  }

  private getCardPortionForPharmacyCheckout(): number | undefined {
    const paymentDue = this.getPaymentDueAmount();
    if (this.paymentMethod === PaymentMethod.Card || this.paymentMethod === PaymentMethod.BankTransfer) {
      return paymentDue;
    }
    if (this.paymentMethod === PaymentMethod.Mixed) {
      return Math.max(0, paymentDue - (this.getCashPortionForPharmacyCheckout() ?? 0));
    }
    return undefined;
  }

  private buildPrintableReceiptHtml(
    receipt: CashierReceiptData,
    templateId: CashierReceiptTemplateId,
    qrImageDataUrl: string
  ): string {
    const isProTemplate = templateId === 'pro';
    const lineItems = receipt.items.map((item, index) => {
      if (isProTemplate) {
        return `
          <tr>
            <td>${index + 1}</td>
            <td class="align-right">${this.escapeHtml(item.name)}</td>
            <td>${item.qty}</td>
            <td>${item.unitPrice.toFixed(2)}</td>
            <td>${item.total.toFixed(2)}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td style="text-align:right">${this.escapeHtml(item.name)}</td>
          <td style="text-align:center">${item.qty}</td>
          <td style="text-align:left">${item.total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const tableHeader = isProTemplate
      ? `
        <thead>
          <tr>
            <th>#</th>
            <th class="align-right">الصنف</th>
            <th>كمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
      `
      : '';

    const qrBlock = (templateId === 'modern' || templateId === 'pro') && qrImageDataUrl
      ? `
        <div class="qr-wrap">
          <img src="${qrImageDataUrl}" alt="QR Code" />
          <small>QR تفاصيل الفاتورة</small>
        </div>
      `
      : '';

    const templateClass = `tpl-${templateId}`;
    const tableClass = isProTemplate ? 'items-table pro-items-table' : 'items-table';
    const footerNote = receipt.footerNote ? `<br/>${this.escapeHtml(receipt.footerNote)}` : '';
    return `
      <!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>Customer Receipt</title>
        <style>
          body {
            margin: 0;
            padding: 8px;
            font-family: Arial, "Cairo", sans-serif;
            background: #fff;
          }
          .receipt {
            width: 80mm;
            border: 1px dashed #b8c8da;
            border-radius: 8px;
            padding: 8px;
            color: #13283d;
          }
          .head { text-align: center; border-bottom: 1px dashed #c8d6e5; padding-bottom: 6px; margin-bottom: 6px; }
          .head h3 { margin: 0; font-size: 14px; }
          .head p { margin: 3px 0 0; font-size: 11px; color: #4d677f; }
          .meta { font-size: 11px; line-height: 1.45; margin-bottom: 6px; display: grid; gap: 2px; }
          .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .items-table td { padding: 2px 0; vertical-align: top; }
          .items-table .align-right { text-align: right; }
          .totals { margin-top: 6px; border-top: 1px dashed #c8d6e5; padding-top: 6px; font-size: 11px; }
          .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
          .totals .grand { font-size: 12px; font-weight: 700; border-top: 1px dotted #c8d6e5; padding-top: 4px; margin-top: 4px; }
          .foot { margin-top: 6px; text-align: center; font-size: 10px; color: #5d7690; border-top: 1px dashed #c8d6e5; padding-top: 5px; }
          .qr-wrap { margin-top: 6px; border-top: 1px dashed #c8d6e5; padding-top: 6px; text-align: center; }
          .qr-wrap img { width: 92px; height: 92px; object-fit: contain; }
          .qr-wrap small { display: block; margin-top: 4px; color: #5d7690; }
          .${templateClass} .receipt { border-style: solid; }
          .tpl-modern .head { background: #f2f8ff; border-radius: 6px; padding: 6px; }
          .tpl-compact .items-table td { font-size: 10px; }
          .tpl-compact .meta { display: none; }
          .tpl-pro .receipt {
            border: 1px solid #c8ddef;
            border-radius: 10px;
            background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
          }
          .tpl-pro .head {
            text-align: right;
            border: 1px solid #d6e7f6;
            border-radius: 8px;
            background: linear-gradient(135deg, #f3f9ff 0%, #eef6ff 100%);
            margin-bottom: 6px;
            padding: 6px;
          }
          .tpl-pro .head h3 { font-size: 12px; }
          .tpl-pro .head p { font-size: 10px; margin-top: 2px; }
          .tpl-pro .meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
          }
          .tpl-pro .meta .meta-card {
            border: 1px solid #e0ebf6;
            border-radius: 6px;
            background: #fbfdff;
            padding: 4px;
            display: grid;
            gap: 1px;
            min-width: 0;
          }
          .tpl-pro .meta .meta-card span {
            color: #6884a0;
            font-size: 9px;
            font-weight: 700;
          }
          .tpl-pro .meta .meta-card strong {
            color: #24405d;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .tpl-pro .pro-items-table {
            margin-top: 6px;
            border: 1px solid #dce9f5;
            border-radius: 6px;
            overflow: hidden;
            table-layout: fixed;
          }
          .tpl-pro .pro-items-table th,
          .tpl-pro .pro-items-table td {
            padding: 3px 2px;
            text-align: center;
            font-size: 10px;
          }
          .tpl-pro .pro-items-table th {
            background: #f2f7fd;
            color: #5f7d99;
            border-bottom: 1px solid #dce9f5;
          }
          .tpl-pro .pro-items-table tbody tr:not(:last-child) td {
            border-bottom: 1px dashed #e3edf8;
          }
          .tpl-pro .totals {
            border-top: 1px solid #d4e4f4;
          }
          .tpl-pro .totals .grand {
            border: 1px solid #d8e8f8;
            border-radius: 6px;
            background: #f4f9ff;
            padding: 4px 6px;
            margin-top: 6px;
            font-size: 12px;
          }
          .tpl-pro .qr-wrap {
            border-top: 1px solid #d4e4f4;
            background: #f8fbff;
            border-radius: 6px;
            padding: 6px;
          }
          .tpl-pro .qr-wrap img {
            width: 104px;
            height: 104px;
          }
          .tpl-pro .foot { font-size: 9px; }
          @page { size: 80mm auto; margin: 0; }
        </style>
      </head>
      <body class="${templateClass}">
        <div class="receipt">
          <div class="head">
            ${receipt.companyLogoUrl ? `<img src="${receipt.companyLogoUrl}" alt="logo" style="max-height:48px; max-width:130px; margin:0 auto 4px auto; display:block; object-fit:contain;" />` : ''}
            <h3 style="margin:2px 0;">${this.escapeHtml(receipt.companyName || (isProTemplate ? 'SMART & PRO | PROFESSIONAL RECEIPT' : 'SMART & PRO POS'))}</h3>
            ${receipt.companyTaxNumber ? `<p style="margin:1px 0; font-size:10px; color:#555;">الرقم الضريبي: ${this.escapeHtml(receipt.companyTaxNumber)}</p>` : ''}
            ${receipt.companyAddress ? `<p style="margin:1px 0; font-size:9px; color:#777;">${this.escapeHtml(receipt.companyAddress)}</p>` : ''}
            <div style="font-weight:bold; font-size:11px; margin:4px 0 2px 0; padding:2px 0; border-top:1px solid #111; border-bottom:1px solid #111;">
              ${receipt.customerTaxNumber ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة'}
            </div>
            <p style="margin-top:2px; font-weight:bold;">${this.escapeHtml(receipt.invoiceNo)} - ${formatDateToString(receipt.invoiceDate)}</p>
          </div>
          <div class="meta" style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="flex:1;">
              <div>الكاشير: ${this.escapeHtml(receipt.cashierName)}</div>
              <div>النقطة: ${this.escapeHtml(receipt.stationName)}</div>
              <div>العميل: ${this.escapeHtml(receipt.customerName)}</div>
              ${receipt.customerTaxNumber ? `<div>الرقم الضريبي للعميل: ${this.escapeHtml(receipt.customerTaxNumber)}</div>` : ''}
              <div>الدفع: ${this.escapeHtml(receipt.paymentLabel)}</div>
            </div>
            ${receipt.isMixedPayment ? `
              <div style="font-size:10px; background:#f4f8fc; border:1px dashed #b8cde4; border-radius:6px; padding:3px 6px; text-align:right; display:flex; flex-direction:column; gap:2px;">
                <div>• نقدي: <strong>${(receipt.mixedCashAmount || 0).toFixed(2)}</strong></div>
                <div>• فيزا/بطاقة: <strong>${(receipt.mixedCardAmount || 0).toFixed(2)}</strong></div>
                ${(receipt.mixedOtherAmount || 0) > 0 ? `<div>• أخرى: <strong>${(receipt.mixedOtherAmount || 0).toFixed(2)}</strong></div>` : ''}
              </div>
            ` : ''}
          </div>
          <table class="${tableClass}">
            ${tableHeader}
            <tbody>
              ${lineItems}
            </tbody>
          </table>
          <div class="totals">
            <div><span>الفرعي</span><strong>${receipt.subtotal.toFixed(2)}</strong></div>
            <div><span>الخصم</span><strong>-${receipt.discount.toFixed(2)}</strong></div>
            <div><span>الضريبة</span><strong>${receipt.tax.toFixed(2)}</strong></div>
            <div class="grand"><span>الإجمالي</span><strong>${receipt.total.toFixed(2)}</strong></div>
            ${!receipt.isMixedPayment ? `
              <div><span>مدفوع</span><strong>${receipt.paidAmount.toFixed(2)}</strong></div>
              <div><span>الباقي</span><strong>${receipt.changeAmount.toFixed(2)}</strong></div>
            ` : ''}
          </div>
          ${qrBlock}
          <div class="foot">شكراً لزيارتكم${footerNote}</div>
        </div>
      </body>
      </html>
    `;
  }

  private buildQrPayload(receipt: CashierReceiptData): string {
    const lines = receipt.items
      .map((item) => `${item.name} | qty:${item.qty} | unit:${item.unitPrice.toFixed(2)} | total:${item.total.toFixed(2)}`)
      .join('\n');

    return [
      `Invoice: ${receipt.invoiceNo}`,
      `Date: ${receipt.invoiceDate.toISOString()}`,
      `Cashier: ${receipt.cashierName}`,
      `Station: ${receipt.stationName}`,
      `Customer: ${receipt.customerName}`,
      `Payment: ${receipt.paymentLabel}`,
      `Subtotal: ${receipt.subtotal.toFixed(2)}`,
      `Discount: ${receipt.discount.toFixed(2)}`,
      `Tax: ${receipt.tax.toFixed(2)}`,
      `Total: ${receipt.total.toFixed(2)}`,
      `Paid: ${receipt.paidAmount.toFixed(2)}`,
      `Change: ${receipt.changeAmount.toFixed(2)}`,
      'Items:',
      lines
    ].join('\n');
  }

  private async generateQrDataUrl(payload: string): Promise<string> {
    if (!payload) {
      return '';
    }

    try {
      const qrModule = await import('qrcode');
      return await qrModule.toDataURL(payload, {
        width: 180,
        margin: 1
      });
    } catch {
      return '';
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
