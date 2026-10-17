import { Component, OnInit, signal, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { getSystemNow, formatDateOnlyToString } from '../../../utils/dateUtils';

import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MessageModule } from 'primeng/message';
import { forkJoin, of, delay, tap } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
// Services
import { ReservationService } from '../../../services/reservations/reservation.service';
import { ReservationCompanyService } from '../../../services/reservations/reservation-company.service';
import { HotelService } from '../../../services/hotels/hotel.service';
import { ReservationSupplierService } from '../../../services/ReservationSupplier/reservation-supplier.service';
import { RootAccountService } from '../../../services/accounting/root-account.service';
import { RoomTypeService } from '../../../services/room-type/room-type.service';
import { ReservationMealService } from '../../../services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from '../../../services/reservations/reservation-view.service';
import { PaymentService } from '../../../services/payment/payment.service';
import { SystemSettingService } from '../../../services/system-setting.service';
import { CompanyDetailsService } from '../../../services/inventory/company-details.service';
import { AuthService } from '../../../modules/auth';
import { UserAccountModel } from '../../../models/auth/userAccount.model';
import { PermissionModel } from '../../../models/auth/permission.model';
import { PERMISSIONS } from '../../../config/permissions';

// Models
import { ReservationModel } from '../../../models/accounting/reservation-model';
import { ReservationCompany } from '../../../models/accounting/reservation-company';
import { HotelModel } from '../../../models/accounting/hotel-model';
import { ReservationSupplierModel } from '../../../models/accounting/reservation-supplier-model';
import { RootAccountModel } from '../../../models/accounting/rootAccount.model';
import { RoomTypeModel } from '../../../models/accounting/room-type-model';
import { ReservationMealModel } from '../../../models/accounting/reservation-meal-model';
import { ReservationView } from '../../../models/accounting/reservation-view';
import { PaymentScheduleModel, PaymentScheduleInvoiceType, CreatePaymentScheduleRequest } from '../../../models/payment/payment-schedule.model';
import { PaymentMethodType, CreatePaymentRequest } from '../../../models/payment/payment.model';

import {TranslationModule, TranslationService} from '../../../modules/i18n';
import { TranslateService } from '@ngx-translate/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { PrintDocumentComponent } from '../../../shared-components/print-document/print-document.component';
import { CustomDatePickerComponent } from '../../../shared-components/custom-date-picker/custom-date-picker.component';
interface PurchaseRow {
  id: string;
  fromDate: Date | null;
  toDate: Date | null;
  numberOfDays: number;
  numberOfRooms: number | null;
  roomTypeId: string | null;
  mealId: string | null;
  mealCost: number | null;
  viewId: string | null;
  viewCost: number | null;
  satCount: number;
  sunCount: number;
  monCount: number;
  tueCount: number;
  wedCount: number;
  thuCount: number;
  friCount: number;
  satCost: number | null;
  sunCost: number | null;
  monCost: number | null;
  tueCost: number | null;
  wedCost: number | null;
  thuCost: number | null;
  friCost: number | null;
  totalCost: number;
}

interface RoomCostDay {
  date: Date;
  dayName: string;
  roomType: string;
  mealPlan: string;
  view: string;
  roomCost: number;
  mpCost: number;
  viewCost: number;
  cost: number;
  vat: number;
  numberOfRooms: number;
  totalCostBeforeVat: number;
  totalVat: number;
  totalCost: number;
}

interface PaymentScheduleRow {
  id: string;
  paymentDate: Date | null;
  dayName: string;
  amount: number | null;
  vat: number | null;
  notes: string | null;
  isSaved: boolean; // Flag to indicate if payment is saved to backend
  paycheckReceiptId?: string | null;
  receiptNo?: string | null;
  isPaid?: boolean;
}

enum PaymentStatus {
  NotPaid = 'NOT_PAID',
  PartiallyPaid = 'PARTIALLY_PAID',
  FullyPaid = 'FULLY_PAID'
}

@Component({
  selector: 'app-reservation-purchases',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DropdownModule,
    CalendarModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    TableModule,
    DialogModule,
    ToastModule,
    CheckboxModule,
    ConfirmDialogModule,
    InputTextareaModule,
    TooltipModule,
    TabViewModule,
    PaginatorModule,
    OverlayPanelModule,
    MessageModule,
    PrintDocumentComponent,
    CustomDatePickerComponent,
    TranslationModule,
    RouterLink
  ],
providers: [MessageService, ConfirmationService],
  templateUrl: './reservation-purchases.component.html',
  styleUrls: ['./reservation-purchases.component.scss'],
})
export class ReservationPurchasesComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  
  purchaseForm!: FormGroup;
  showPurchaseDialog = signal(false);
  isViewMode = signal(false);
  loading = signal(false);

  // Purchase rows
  purchaseRows: PurchaseRow[] = [];
  
  // Rooms Cost rows
  roomsCostDays: RoomCostDay[] = [];
  
  // Payment Schedule rows
  paymentScheduleRows: PaymentScheduleRow[] = [];
  
  // View mode data
  allInvoices: any[] = [];
  previewInvoices = signal<any[]>([]);
  previewPage = 0;
  previewRows = 10;
  currentInvoiceIndex = signal(0);
  currentInvoice: any = null;
  currentInvoiceId: string | null = null;
  
  // Dropdown options
  private _suppliersOptions = signal<any[]>([]);
  private _hotelsOptions = signal<any[]>([]);
  private _companiesOptions = signal<any[]>([]);
  private _accountsOptions = signal<any[]>([]);
  private _roomTypesOptions = signal<any[]>([]);
  private _mealsOptions = signal<any[]>([]);
  private _viewsOptions = signal<any[]>([]);
  private _currenciesOptions = signal<any[]>([]);
  private hotelNameById = new Map<string, string>();
  private accountNameById = new Map<string, string>();
  private hotelsCacheKey = 'reservation_purchases_hotels_en';
viewSingleInvoice = signal(false);

  // Batch selection state
  selectedInvoices: any[] = [];

  // Print orientation dialog state
  printOrientationDialogVisible = false;
  pendingInvoiceId: number | null = null;
  pendingIsPrint = false;
  selectedPrintType: 'A4Portrait' | 'A4Landscape' = 'A4Portrait';

  // Print columns configuration
  printColumns = [
    { field: 'printRowNo', header: 'م', headerEn: '#', width: '40px' },
    { field: 'roomType', header: 'نوع الغرفة', headerEn: 'Room Type', width: '120px' },
    { field: 'mealPlan', header: 'خطة الوجبة', headerEn: 'Meal Plan', width: '35px' },
    { field: 'view', header: 'الإطلالة', headerEn: 'View', width: '80px' },
    { field: 'date', header: 'التاريخ', headerEn: 'Date', pipe: 'date', width: '110px' },
    { field: 'dayName', header: 'اليوم', headerEn: 'Day', width: '80px' },
    { field: 'numberOfRooms', header: 'عدد الغرف', headerEn: 'Rooms', width: '70px' },
    { field: 'totalCostBeforeVat', header: 'التكلفة قبل الضريبة', headerEn: 'Cost Before Tax', pipe: 'number', width: 'auto' },
    { field: 'totalVat', header: 'الضريبة', headerEn: 'Tax', pipe: 'number', width: 'auto' },
    { field: 'totalCost', header: 'الإجمالي', headerEn: 'Total', pipe: 'number', width: 'auto' }
  ];

  // Reservation print settings (DB-backed)
  showReservationStamp: boolean = true;
  showReservationCompanySignature: boolean = true;
  showReservationCustomerSignature: boolean = true;
  reservationSelectedPolicies: { id: string; name: string; checked: boolean }[] = [];
  reservationSelectedBanks: { id: string; bankName: string; accountNumber: string; checked: boolean }[] = [];
  companyDetailsForPrint: any = null;

  isFrontal = false;
  activeLanguage = 'en';
  activeTabIndex: number = 0;
  userPermissions: PermissionModel[] = [];
  PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.userPermissions?.some(p => p.name === permission) ?? false;
  }

  onTabChange(event: any): void {
    this.activeTabIndex = event?.index ?? 0;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private reservationService: ReservationService,
    private reservationCompanyService: ReservationCompanyService,
    private hotelService: HotelService,
    private reservationSupplierService: ReservationSupplierService,
    private rootAccountService: RootAccountService,
    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private translationService: TranslationService,
    private translateService: TranslateService,
    private paymentService: PaymentService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private systemSettingService: SystemSettingService,
    private companyDetailsService: CompanyDetailsService,
    private authService: AuthService
  ) {
    this.isFrontal = this.router.url.includes('frontal');
    this.activeLanguage = this.translationService.getSelectedLanguage?.() ?? 'en';
    this.hotelsCacheKey = `reservation_purchases_hotels_${this.activeLanguage}`;

    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userPermissions = res.userRoles
          .map(ur => ur.role.rolePermissions.map(rp => rp.permission))
          .reduce((acc, val) => acc.concat(val), []);
      }
    });
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadDropdowns();
    this.loadPurchasesPreview();
    this.loadPrintSettings();

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id && id !== 'new') {
        const isEdit = this.router.url.includes('/edit/');
        this.loadInvoiceById(id, isEdit);
      } else if (this.router.url.includes('/new')) {
        this.initNewPurchaseForm();
      } else {
        this.showPurchaseDialog.set(false);
      }
    });

    // ربط رقم السند بالدفعة عند الرجوع من صفحة إنشاء سند الصرف
    this.route.queryParams.subscribe(params => {
      const receiptNo = params['receiptNo'];
      const receiptId = params['receiptId'];
      const scheduleId = params['scheduleId'];
      if (receiptNo && scheduleId) {
        // انتظر تحميل الصفوف ثم حدّث الصف المناسب
        const updateRow = () => {
          const row = this.paymentScheduleRows.find(r => r.id === scheduleId);
          if (row) {
            row.receiptNo = decodeURIComponent(receiptNo);
            row.paycheckReceiptId = receiptId || null;
            row.isPaid = true;
            this.messageService.add({
              severity: 'success',
              summary: 'تم الربط',
              detail: `تم ربط سند الصرف رقم ${row.receiptNo} بالدفعة بنجاح`
            });
          } else if (this.paymentScheduleRows.length === 0) {
            // الصفوف لم تحمّل بعد - أعد المحاولة بعد ثانية
            setTimeout(updateRow, 1000);
          }
        };
        // أعط وقتاً لتحميل الفاتورة والصفوف
        setTimeout(updateRow, 500);
      }
    });
  }


  private buildForm(): void {
    this.purchaseForm = this.fb.group({
      invoiceNo: [null],
      hotelId: [null, Validators.required],
      mainAccountId: [null, Validators.required], // Renamed from accountId
      currency: ['SAR', Validators.required],
      description: [null],
      issueDate: [getSystemNow(), Validators.required],
      dueDate: [getSystemNow(), Validators.required],
      taxRate: [null, [Validators.min(0), Validators.max(100)]],
      discount: [null, [Validators.min(0)]],
      isFrontal: [this.isFrontal]
    });
    
    // Listen to tax rate changes to update Rooms Cost table
    this.purchaseForm.get('taxRate')?.valueChanges.subscribe(() => {
      this.fillRoomsCostTable();
    });
  }

  private loadPrintSettings(): void {
    // Load SystemSetting for reservation print settings
    this.systemSettingService.getAll().subscribe({
      next: (settings) => {
        if (settings && settings.length > 0) {
          const setting = settings[0];
          this.showReservationStamp = setting.showStampInReservationPrint ?? true;
          this.showReservationCompanySignature = setting.showCompanySignatureInReservationPrint ?? true;
          this.showReservationCustomerSignature = setting.showCustomerSignatureInReservationPrint ?? true;

          // Load unchecked IDs
          const uncheckedPolicyIds = setting.defaultReservationUncheckedPolicyIds || [];
          const uncheckedBankIds = setting.defaultReservationUncheckedBankIds || [];

          // Load CompanyDetails for policies and banks
          this.companyDetailsService.getAll().subscribe({
            next: (companyData) => {
              if (companyData && companyData.length > 0) {
                this.companyDetailsForPrint = companyData[0];

                // Build reservation policies list
                if (this.companyDetailsForPrint?.policies) {
                  this.reservationSelectedPolicies = this.companyDetailsForPrint.policies
                    .filter((p: any) => p.policyParagraph && p.policyParagraph.trim())
                    .map((p: any) => {
                      const idStr = String(p.id || '');
                      return {
                        id: idStr,
                        name: p.policyParagraph || '',
                        checked: !uncheckedPolicyIds.includes(idStr)
                      };
                    });
                }

                // Build reservation banks list
                if (this.companyDetailsForPrint?.bankAccounts) {
                  this.reservationSelectedBanks = this.companyDetailsForPrint.bankAccounts
                    .filter((b: any) => (b.bankName && b.bankName.trim()) || (b.bankAccountNumber && b.bankAccountNumber.trim()) || (b.iban && b.iban.trim()))
                    .map((b: any) => {
                      const idStr = String(b.id || '');
                      return {
                        id: idStr,
                        bankName: b.bankName || '',
                        accountNumber: b.bankAccountNumber || '',
                        checked: !uncheckedBankIds.includes(idStr)
                      };
                    });
                }
              }
            },
            error: (err) => console.error('Error loading company details for print:', err)
          });
        }
      },
      error: (err) => console.error('Error loading system settings:', err)
    });
  }

  private loadDropdowns(): void {
    this.loading.set(true);

    this.loadHotelsFromCache();

    const hotels$ = this.hotelService.getAll().pipe(
      tap((hotels: HotelModel[]) => {
        const options = (hotels || []).map((item: HotelModel) => ({
          label: this.pickName(item),
          value: item.id,
        }));
        this._hotelsOptions.set(options);
        this.hotelNameById = new Map(
          options.map((option) => [String(option.value), option.label])
        );
        try {
          localStorage.setItem(this.hotelsCacheKey, JSON.stringify(options));
        } catch {
          // Ignore cache write errors
        }
      })
    );

    const companies$ = this.reservationCompanyService.getAll().pipe(
      tap((companies: ReservationCompany[]) => {
        this._companiesOptions.set(
          (companies || []).map((item: ReservationCompany) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
      })
    );

    const accounts$ = this.rootAccountService.getAll().pipe(
      tap((accounts: RootAccountModel[]) => {
        const accountsOptions: any[] = [];
        const accountMap = new Map<string, string>();
        const rootAccounts = accounts || [];

        for (let rootAccount of rootAccounts) {
          for (let headerAccount of rootAccount.headerAccounts || []) {
            for (let detailAccount of headerAccount.detailAccounts || []) {
              for (let mainAccount of detailAccount.mainAccounts || []) {
                const accountName =
                  this.activeLanguage === 'ar'
                    ? mainAccount.arabicName
                    : mainAccount.englishName;
                const label = `${mainAccount.referenceCode} | ${accountName}`;
                accountsOptions.push({
                  label,
                  value: mainAccount.id,
                });
                accountMap.set(String(mainAccount.id), accountName);
              }
            }
          }
        }

        this._accountsOptions.set(accountsOptions);
        this.accountNameById = accountMap;
      })
    );

    const roomTypes$ = this.roomTypeService.getAll().pipe(
      tap((roomTypes: RoomTypeModel[]) => {
        this._roomTypesOptions.set(
          (roomTypes || []).map((item: RoomTypeModel) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
      })
    );

    const meals$ = this.reservationMealService.getAll().pipe(
      tap((meals: ReservationMealModel[]) => {
        this._mealsOptions.set(
          (meals || []).map((item: ReservationMealModel) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
      })
    );

    const views$ = this.reservationViewService.getAll().pipe(
      tap((views: ReservationView[]) => {
        this._viewsOptions.set(
          (views || []).map((item: ReservationView) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
      })
    );

    forkJoin({
      hotels: hotels$,
      companies: companies$,
      accounts: accounts$,
      roomTypes: roomTypes$,
      meals: meals$,
      views: views$,
    }).subscribe({
      next: () => {
        this._currenciesOptions.set([
          { label: 'SAR', value: 'SAR' },
          { label: 'USD', value: 'USD' },
          { label: 'EGP', value: 'EGP' },
        ]);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dropdowns', err);
        this.loading.set(false);
      },
    });
  }

  private loadHotelsFromCache(): void {
    try {
      const raw = localStorage.getItem(this.hotelsCacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (!Array.isArray(cached)) return;
      this._hotelsOptions.set(cached);
      this.hotelNameById = new Map(
        cached.map((option: { value: string | number; label: string }) => [
          String(option.value),
          option.label,
        ])
      );
    } catch {
      // Ignore cache read errors
    }
  }
selectedInvoiceForMenu: any = null;
onInvoiceMenuClick(event: MouseEvent, overlay: OverlayPanel, invoice: any): void {
  event.preventDefault(); // Prevent native browser context menu
  event.stopPropagation();
  
  const isVisible = overlay.overlayVisible;
  const isDifferent = this.selectedInvoiceForMenu?.id !== invoice.id;
  this.selectedInvoiceForMenu = invoice;
  
  // If overlay is visible and clicking on a different invoice, show it immediately
  if (isVisible && isDifferent) {
    overlay.show(event);
  } else {
    overlay.toggle(event);
  }
  
  // Position overlay at cursor location with viewport boundary checks
  setTimeout(() => {
    const panelEl = overlay.container as HTMLElement;
    if (panelEl) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelRect = panelEl.getBoundingClientRect();

      let left = event.clientX;
      let top = event.clientY;

      // Prevent overflow on the right
      if (left + panelRect.width > viewportWidth) {
        left = viewportWidth - panelRect.width - 10; // 10px margin
      }
      if (left < 10) {
        left = 10;
      }

      // Prevent overflow on the bottom
      if (top + panelRect.height > viewportHeight) {
        top = viewportHeight - panelRect.height - 10; // 10px margin
      }
      if (top < 10) {
        top = 10;
      }

      // Position below the button/cursor
      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
      left = buttonRect.left;
      top = buttonRect.bottom + 5;

      if (left + panelRect.width > viewportWidth) {
        left = viewportWidth - panelRect.width - 10;
      }
      if (top + panelRect.height > viewportHeight) {
        top = buttonRect.top - panelRect.height - 5;
      }

      panelEl.style.position = 'fixed';
      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
      panelEl.style.zIndex = '9999';
    }
  });
}
openInvoiceOverlay(event: Event, overlay: any, invoice: any): void {
  event.stopPropagation();
  this.selectedInvoiceForMenu = invoice;
  overlay.toggle(event);
}

printServerInvoice(invoice: any): void {
  this.pendingInvoiceId = invoice?.id || invoice?.hotelAllotmentInvoiceId || null;
  this.pendingIsPrint = true;
  this.showPrintOrientationDialog(this.pendingInvoiceId, true);
}

downloadServerInvoice(invoice: any): void {
  this.pendingInvoiceId = invoice?.id || invoice?.hotelAllotmentInvoiceId || null;
  this.pendingIsPrint = false;
  this.showPrintOrientationDialog(this.pendingInvoiceId, false);
}

showPrintOrientationDialog(invoiceId: number | null, isPrint: boolean): void {
  if (!invoiceId) {
    this.showWarn('رقم الفاتورة غير موجود\nInvoice ID not found');
    return;
  }
  this.selectedPrintType = 'A4Portrait';
  this.pendingInvoiceId = invoiceId;
  this.pendingIsPrint = isPrint;
  this.printOrientationDialogVisible = true;
}

confirmPrintOrientation(): void {
  if (!this.pendingInvoiceId) return;
  this.printOrientationDialogVisible = false;

  if (this.pendingIsPrint) {
    this.reservationService.printAllotmentDocument(this.pendingInvoiceId, this.selectedPrintType);
  } else {
    this.reservationService.downloadAllotmentDocument(this.pendingInvoiceId, this.selectedPrintType);
  }
  this.pendingInvoiceId = null;
}

onSelectionChange(invoice: any): void {
  const invId = invoice?.id || invoice?.hotelAllotmentInvoiceId;
  if (!invId) return;
  const idx = this.selectedInvoices.findIndex(
    inv => (inv.id || inv.hotelAllotmentInvoiceId) === invId
  );
  if (idx >= 0) {
    this.selectedInvoices.splice(idx, 1);
  } else {
    this.selectedInvoices.push(invoice);
  }
}

private getInvoiceId(invoice: any): number | null {
  return invoice?.id || invoice?.hotelAllotmentInvoiceId || null;
}

isSelected(invoice: any): boolean {
  const id = this.getInvoiceId(invoice);
  return id != null && this.selectedInvoices.some(s => this.getInvoiceId(s) === id);
}

get allPageSelected(): boolean {
  const page = this.previewPage;
  const rows = this.previewRows;
  const visible = this.previewInvoices().slice(page * rows, page * rows + rows);
  if (!visible.length) return false;
  return visible.every(inv => this.isSelected(inv));
}

selectAllInvoices(checked: boolean): void {
  if (checked) {
    const visible = this.previewInvoices();
    this.selectedInvoices = [...visible];
  } else {
    this.selectedInvoices = [];
  }
}

hasUnsavedPayments(): boolean {
  return this.paymentScheduleRows.some(row => !row.isSaved && row.paymentDate && row.amount !== null && row.amount !== undefined);
}

saveUnsavedPayments(): void {
  if (!this.currentInvoice?.id) return;
  
  const validUnsavedPayments = this.paymentScheduleRows.filter(
    row => !row.isSaved && row.paymentDate && row.amount !== null && row.amount !== undefined
  );
  
  if (validUnsavedPayments.length === 0) {
    this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'لا توجد دفعات جديدة جاهزة للحفظ (تأكد من إدخال المبلغ والتاريخ).' });
    return;
  }

  const requests = validUnsavedPayments.map(row => {
    const paymentDate = row.paymentDate ? new Date(row.paymentDate) : null;
    const request: CreatePaymentScheduleRequest = {
      invoiceId: String(this.currentInvoice.id),
      invoiceType: PaymentScheduleInvoiceType.HotelAllotmentInvoice,
      amount: row.amount ?? 0,
      vat: row.vat ?? 0,
      paymentDate: paymentDate ? paymentDate.toISOString() : null,
      notes: row.notes || null,
      entryNo: null,
      paymentMethodType: null,
      referenceNumber: null,
      treasuryId: null,
      paycheckReceiptId: null,
      receiptNo: null
    };
    return this.paymentService.createPaymentSchedule(request);
  });

  forkJoin(requests).subscribe({
    next: (responses) => {
      this.messageService.add({ severity: 'success', summary: 'نجاح', detail: 'تم حفظ الدفعات بنجاح.' });
      this.loadPaymentSchedules(String(this.currentInvoice.id));
    },
    error: (error) => {
      const errorMessage = error.error?.message || 'حدث خطأ أثناء حفظ الدفعات';
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: errorMessage });
    }
  });
}

clearSelection(): void {
  this.selectedInvoices = [];
}

private extractSelectedIds(): number[] {
  return this.selectedInvoices
    .map(inv => inv.id || inv.hotelAllotmentInvoiceId)
    .filter((id: number | undefined): id is number => id != null);
}

printSelectedServerInvoices(): void {
  const ids = this.extractSelectedIds();
  if (!ids.length) return;
  this.reservationService.printAllotmentDocuments(ids);
}

downloadSelectedServerInvoices(): void {
  const ids = this.extractSelectedIds();
  if (!ids.length) return;
  this.reservationService.downloadAllotmentDocuments(ids);
}

downloadMergedSelected(): void {
  const ids = this.extractSelectedIds();
  if (!ids.length) return;
  this.reservationService.downloadAllotmentMerged(ids);
}

printMergedSelected(): void {
  const ids = this.extractSelectedIds();
  if (!ids.length) return;
  this.reservationService.printAllotmentMerged(ids);
}

downloadAllInvoicesPdf(): void {
  this.reservationService.downloadAllAllotmentDocuments();
}

downloadAllMergedInvoicesPdf(): void {
  this.reservationService.downloadAllAllotmentMerged();
}

printPurchaseInvoice(invoice: any): void {
  console.log('PRINT invoice:', invoice);
  
  this.currentInvoice = invoice;
  
  of(invoice).pipe(
    tap(inv => this.loadInvoice(inv)),
    delay(0),
    tap(() => {
      console.log('Purchase rows:', this.purchaseRows.length);
      console.log('Room cost days:', this.roomsCostDays.length);
      console.log('Print component exists:', !!this.printComponent);
      
      // Force Angular to update the DOM before printing
      this.cdr.detectChanges();
      
      if (this.printComponent) {
        if (this.roomsCostDays.length > 0) {
          console.log('Triggering print...');
          setTimeout(() => {
            this.printComponent.triggerPrint();
          }, 100);
        } else {
          console.error('No room cost data available');
          this.showWarn('لا توجد بيانات تكلفة الغرف للطباعة\nNo room cost data available for printing');
        }
      } else {
        console.error('Print component not initialized');
        this.showWarn('مكون الطباعة غير جاهز. يرجى المحاولة مرة أخرى\nPrint component not ready. Please try again');
      }
    })
  ).subscribe();
}

openEditDialog(invoice: any): void {
  console.log('EDIT invoice:', invoice);
  const id = invoice?.id || invoice?.hotelAllotmentInvoiceId;
  if (id) {
    this.router.navigate([this.isFrontal ? '/frontal-reservation-purchases/edit' : '/reservation-purchases/edit', id]);
  } else {
    this.isViewMode.set(false);
    this.showPurchaseDialog.set(true);
    this.loading.set(true);
    this.loadInvoice(invoice);
    this.loading.set(false);
  }
}

createTransactionForInvoice(invoice: any): void {
  const invoiceId = invoice?.id || invoice?.hotelAllotmentInvoiceId;

  if (!invoiceId) {
    this.showError(this.translateService.instant('RESERVATION_PURCHASE.INVOICE_NOT_FOUND'));
    return;
  }

  this.confirmationService.confirm({
    header: this.translateService.instant('RESERVATION_PURCHASE.CONFIRM_TRANSACTION_TITLE'),
    message: this.translateService.instant('RESERVATION_PURCHASE.CONFIRM_TRANSACTION_MSG'),
    icon: 'pi pi-book text-blue-500 text-2xl',
    acceptLabel: this.translateService.instant('RESERVATION_PURCHASE.CONFIRM_TRANSACTION_YES'),
    rejectLabel: this.translateService.instant('RESERVATION_PURCHASE.CANCEL'),
    acceptIcon: 'pi pi-check me-1',
    rejectIcon: 'pi pi-times me-1',
    acceptButtonStyleClass: 'p-button-success p-button-sm font-semibold',
    rejectButtonStyleClass: 'p-button-secondary p-button-text p-button-sm',

    accept: () => {
      this.loading.set(true);
      this.reservationService.createPurchaseTransaction(invoiceId).subscribe({
        next: (response) => {
          this.loading.set(false);
          this.showSuccess(this.translateService.instant('RESERVATION_PURCHASE.TRANSACTION_SUCCESS'));
          const transactionId = response?.transactionId || response?.id || response?.data?.id;
          if (this.currentInvoice && transactionId) {
            this.currentInvoice.transactionId = transactionId;
          }
          this.loadInvoiceData();
          this.loadPurchasesPreview();
          console.log('Transaction created:', response);
        },
        error: (error) => {
          this.loading.set(false);
          console.error('Error creating transaction:', error);
          this.showError(this.translateService.instant('RESERVATION_PURCHASE.TRANSACTION_ERROR'));
        }
      });
    },
    reject: () => {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('RESERVATION_PURCHASE.CANCEL'),
        detail: this.translateService.instant('RESERVATION_PURCHASE.TRANSACTION_CANCELLED')
      });
    }
  });
}

/**
 * Load payment schedules from backend for an invoice
 */
loadPaymentSchedules(invoiceId: string): void {
  this.paymentService.getPaymentSchedulesByInvoice(invoiceId, PaymentScheduleInvoiceType.HotelAllotmentInvoice)
    .subscribe({
      next: (schedules: PaymentScheduleModel[]) => {
        this.paymentScheduleRows = schedules.map(schedule => ({
          id: schedule.id || this.generateId(),
          paymentDate: schedule.paymentDate ? new Date(schedule.paymentDate) : null,
          dayName: this.getDayName(schedule.paymentDate ? new Date(schedule.paymentDate).getDay() : 0),
          amount: schedule.amount ?? null,
          vat: schedule.vat ?? null,
          notes: schedule.notes || null,
          isSaved: true, // Loaded from backend, so marked as saved
          paycheckReceiptId: schedule.paycheckReceiptId || null,
          receiptNo: schedule.receiptNo || null,
          isPaid: !!(schedule.paycheckReceiptId || schedule.receiptNo)
        }));
        
        console.log('Payment schedules loaded:', this.paymentScheduleRows.length);
      },
      error: (error) => {
        console.error('Error loading payment schedules:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل جدول الدفعات'
        });
      }
    });
}

deletePurchaseInvoice(invoice: any): void {
  console.log('DELETE', invoice);
  // TODO: Confirm dialog ثم call API delete
}

/**
 * Navigate to create payment voucher (سند صرف) for this scheduled payment
 */
createPaymentVoucher(row: PaymentScheduleRow): void {
  if (!this.currentInvoice?.id) {
    this.messageService.add({
      severity: 'warn',
      summary: 'تحذير',
      detail: 'يرجى حفظ الفاتورة أولاً'
    });
    return;
  }

  const routePath = this.isFrontal ? '/receipts/frontal-paycheck-receipts/new' : '/receipts/paycheck-receipts/new';

  // returnUrl = الرابط الحالي بدون query params لنرجع له بعد حفظ السند
  const currentUrl = this.router.url.split('?')[0];

  this.router.navigate([routePath], {
    queryParams: {
      connectedHotelInvoiceId: this.currentInvoice.id,
      invoiceNo: this.currentInvoice.invoiceNo,
      amount: row.amount,
      vat: row.vat,
      scheduleId: row.id,
      mainAccountId: this.currentInvoice.mainAccountId || this.purchaseForm.get('mainAccountId')?.value,
      notes: row.notes || `دفعة مشتريات حجوزات رقم ${this.currentInvoice.invoiceNo || this.currentInvoice.id}`,
      returnUrl: currentUrl
    }
  });
}

 private loadPurchasesPreview(): void {
  (this.reservationService as any).getAllPurchases().subscribe({
    next: (invoices: any[]) => {
      this.previewInvoices.set(invoices || []);
    },
    error: (err: any) => {
      console.error('Error loading purchases preview', err);
      this.previewInvoices.set([]);
    }
  });
}


  hotelsOptions = () => this._hotelsOptions();
  companiesOptions = () => this._companiesOptions();
  accountsOptions = () => this._accountsOptions();
  roomTypesOptions = () => this._roomTypesOptions();
  mealsOptions = () => this._mealsOptions();
  viewsOptions = () => this._viewsOptions();
  currenciesOptions = () => this._currenciesOptions();
  
  getRoomTypeName(id: string | null): string {
    if (!id) return '-';
    const option = this._roomTypesOptions().find(opt => opt.value === id);
    return option?.label || '-';
  }

  getHotelName(id: string | null): string {
    if (!id) return '-';
    this._hotelsOptions(); // Keep template reactive to hotel data loading
    return this.hotelNameById.get(String(id)) || '-';
  }

  getAccountName(id: string | null): string {
    if (!id) return '-';
    this._accountsOptions(); // Keep template reactive to account data loading
    return this.accountNameById.get(String(id)) || '-';
  }
  
  getMealName(id: string | null): string {
    if (!id) return '-';
    const option = this._mealsOptions().find(opt => opt.value === id);
    return option?.label || '-';
  }
  
  getViewName(id: string | null): string {
    if (!id) return '-';
    const option = this._viewsOptions().find(opt => opt.value === id);
    return option?.label || '-';
  }
  
  getDayName(day: number): string {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[day];
  }
  
  fillRoomsCostTable(): void {
    this.roomsCostDays = [];
    
    // Get all rows with valid dates
    const validRows = this.purchaseRows.filter(row => 
      row.fromDate && row.toDate && row.roomTypeId && row.numberOfRooms
    );
    
    if (validRows.length === 0) return;
    
    // Group by room type first
    const roomTypeGroups = new Map<string, RoomCostDay[]>();
    
    validRows.forEach(row => {
      if (!row.fromDate || !row.toDate) return;
      
      const roomTypeId = row.roomTypeId!;
      const roomTypeName = this.getRoomTypeName(roomTypeId);
      
      // Get or create array for this room type
      if (!roomTypeGroups.has(roomTypeId)) {
        roomTypeGroups.set(roomTypeId, []);
      }
      
      const roomTypeDays = roomTypeGroups.get(roomTypeId)!;
      
      let currentDate = new Date(row.fromDate);
      const endDate = new Date(row.toDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Get cost for this day
        let dayCost = 0;
        switch(dayOfWeek) {
          case 0: dayCost = row.sunCost ?? 0; break; // Sunday
          case 1: dayCost = row.monCost ?? 0; break; // Monday
          case 2: dayCost = row.tueCost ?? 0; break; // Tuesday
          case 3: dayCost = row.wedCost ?? 0; break; // Wednesday
          case 4: dayCost = row.thuCost ?? 0; break; // Thursday
          case 5: dayCost = row.friCost ?? 0; break; // Friday
          case 6: dayCost = row.satCost ?? 0; break; // Saturday
        }
        
        const mpCost = row.mealCost ?? 0;
        const viewCost = row.viewCost ?? 0;
        const cost = dayCost + mpCost + viewCost;
        const numberOfRooms = row.numberOfRooms ?? 0;
        const totalCostBeforeVat = cost * numberOfRooms;
        
        // Check if this date already exists for this room type
        const dateKey = formatDateOnlyToString(currentDate);
        const existingDay = roomTypeDays.find(d => 
          formatDateOnlyToString(d.date) === dateKey
        );
        
        if (existingDay) {
          existingDay.totalCostBeforeVat += totalCostBeforeVat;
          existingDay.totalCost = existingDay.totalCostBeforeVat;
          existingDay.numberOfRooms = Math.max(existingDay.numberOfRooms, numberOfRooms);
        } else {
          roomTypeDays.push({
            date: new Date(currentDate),
            dayName: this.getDayName(dayOfWeek),
            roomType: roomTypeName,
            mealPlan: this.getMealName(row.mealId),
            view: this.getViewName(row.viewId),
            roomCost: dayCost,
            mpCost: mpCost,
            viewCost: viewCost,
            cost: cost,
            vat: 0,
            numberOfRooms: numberOfRooms,
            totalCostBeforeVat: totalCostBeforeVat,
            totalVat: 0,
            totalCost: totalCostBeforeVat
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    // Sort each room type group by date, then combine all groups
    this.roomsCostDays = [];
    
    // Sort room types to maintain consistent order
    const sortedRoomTypes = Array.from(roomTypeGroups.keys()).sort((a, b) => {
      const nameA = this.getRoomTypeName(a);
      const nameB = this.getRoomTypeName(b);
      return nameA.localeCompare(nameB);
    });
    
    sortedRoomTypes.forEach(roomTypeId => {
      const days = roomTypeGroups.get(roomTypeId)!;
      // Sort days by date within each room type
      days.sort((a, b) => a.date.getTime() - b.date.getTime());
      // Add to main array
      this.roomsCostDays.push(...days);
    });
    
    // Add row numbers for printing
    this.roomsCostDays = this.roomsCostDays.map((day, index) => ({
      ...day,
      printRowNo: index + 1
    }));
  }
  
  getRoomsCostTotalBeforeVat(): number {
    return this.roomsCostDays.reduce((sum, day) => sum + day.totalCostBeforeVat, 0);
  }
  
  getRoomsCostTotalVat(): number {
    return this.roomsCostDays.reduce((sum, day) => sum + day.totalVat, 0);
  }
  
  getRoomsCostTotalCost(): number {
    return this.roomsCostDays.reduce((sum, day) => sum + day.totalCost, 0);
  }
  
  formatDate(date: Date | string): string {
    if (!date) return '';
    
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) return '';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

  openPurchaseDialog(): void {
    if (!this.router.url.includes('/new')) {
      this.router.navigate([this.isFrontal ? '/frontal-reservation-purchases/new' : '/reservation-purchases/new']);
    } else {
      this.initNewPurchaseForm();
    }
  }

  private initNewPurchaseForm(): void {
    this.isViewMode.set(false);
    this.purchaseForm.enable();
    this.showPurchaseDialog.set(true);
    // Add 6 rows by default
    this.purchaseRows = [];
    for (let i = 0; i < 6; i++) {
      this.addRow();
    }
    // Add 5 payment schedule rows by default
    this.paymentScheduleRows = [];
    for (let i = 0; i < 5; i++) {
      this.addPaymentRow();
    }
  }

  loadInvoiceById(id: string, isEdit: boolean = false): void {
    this.loading.set(true);
    this.isViewMode.set(!isEdit);
    this.showPurchaseDialog.set(true);

    this.reservationService.getPurchaseById(id).subscribe({
      next: (invoice) => {
        if (invoice) {
          this.allInvoices = [invoice];
          this.currentInvoiceIndex.set(0);
          this.loadInvoice(invoice);
        } else {
          this.showWarn('الفاتورة غير موجودة');
          this.closePurchaseDialog();
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading purchase invoice by ID:', err);
        this.showError('حدث خطأ أثناء تحميل الفاتورة');
        this.closePurchaseDialog();
        this.loading.set(false);
      }
    });
  }

 openViewDialog(selectedInvoice?: any, single: boolean = false): void {
  const id = selectedInvoice?.id || selectedInvoice?.hotelAllotmentInvoiceId;
  if (single && id) {
    this.router.navigate([this.isFrontal ? '/frontal-reservation-purchases' : '/reservation-purchases', id]);
    return;
  }

  this.isViewMode.set(true);
  this.viewSingleInvoice.set(!!single);
  this.loading.set(true);
  this.showPurchaseDialog.set(true);

  // ✅ لو المستخدم ضغط على صف: اعرض هذه الفاتورة فقط بدون أي فواتير أخرى
  if (single && selectedInvoice) {
    this.allInvoices = [selectedInvoice];
    this.currentInvoiceIndex.set(0);
    this.loadInvoice(selectedInvoice);
    this.loading.set(false);
    return;
  }

  // ✅ زر "عرض الفواتير": اعرض الكل (مع تنقل)
  (this.reservationService as any).getAllPurchases().subscribe({
    next: (invoices: any[]) => {
      this.allInvoices = invoices || [];

      if (!this.allInvoices.length) {
        this.showWarn('لا توجد فواتير');
        this.loading.set(false);
        this.closePurchaseDialog();
        return;
      }

      // لو داخل من زر عرض الفواتير -> افتح أول فاتورة
      this.currentInvoiceIndex.set(0);
      this.loadInvoice(this.allInvoices[0]);
      this.loading.set(false);
    },
    error: (err: any) => {
      console.error('Error loading invoices', err);
      this.showError('حدث خطأ أثناء تحميل الفواتير');
      this.loading.set(false);
      this.closePurchaseDialog();
    }
  });
}


  onPreviewPageChange(event: any): void {
    this.previewPage = event.page ?? 0;
    this.previewRows = event.rows ?? this.previewRows;
  }

  loadInvoice(invoice: any): void {
    this.currentInvoice = invoice;
    this.currentInvoiceId = invoice?.id || invoice?.hotelAllotmentInvoiceId || null;
    
    // Fill form first to load the data
    this.purchaseForm.patchValue({
      invoiceNo: invoice.invoiceNo || null,
      hotelId: invoice.hotelId,
      mainAccountId: invoice.mainAccountId,
      currency: invoice.currency || 'SAR',
      description: invoice.description || null,
      issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
      taxRate: invoice.tax ?? null,
      discount: invoice.discount ?? null,
      isFrontal: invoice.isFrontal || this.isFrontal
    });
    
    if (this.isViewMode()) {
      this.purchaseForm.disable();
    } else {
      this.purchaseForm.enable();
    }
    
    // Fill rows from hotelAllotmentRooms
    this.purchaseRows = [];
    if (invoice.hotelAllotmentRooms && Array.isArray(invoice.hotelAllotmentRooms)) {
      for (const room of invoice.hotelAllotmentRooms) {
        const avgRooms = room.numberOfRooms || 0;
        
        const row: PurchaseRow = {
          id: this.generateId(),
          fromDate: room.fromDate ? new Date(room.fromDate) : null,
          toDate: room.toDate ? new Date(room.toDate) : null,
          numberOfDays: 0,
          numberOfRooms: avgRooms || null,
          roomTypeId: room.roomTypeId,
          mealId: room.mealPlanId,
          mealCost: room.mealPlanCost || null,
          viewId: room.viewId,
          viewCost: room.viewCost || null,
          satCount: 0,
          sunCount: 0,
          monCount: 0,
          tueCount: 0,
          wedCount: 0,
          thuCount: 0,
          friCount: 0,
          satCost: room.pricePerDay?.Saturday || null,
          sunCost: room.pricePerDay?.Sunday || null,
          monCost: room.pricePerDay?.Monday || null,
          tueCost: room.pricePerDay?.Tuesday || null,
          wedCost: room.pricePerDay?.Wednesday || null,
          thuCost: room.pricePerDay?.Thursday || null,
          friCost: room.pricePerDay?.Friday || null,
          totalCost: 0
        };
        
        // Calculate days and day counts
        if (row.fromDate && row.toDate) {
          // Calculate days including both from and to dates
          const fromDate = new Date(row.fromDate);
          const toDate = new Date(row.toDate);
          // Reset time to start of day for accurate calculation
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(0, 0, 0, 0);
          const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
          // Add 1 to include both from and to dates
          row.numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          this.calculateDayCounts(row);
        }
        
        this.calculateRowTotal(row);
        this.purchaseRows.push(row);
      }
    }
    
    // Ensure at least 6 rows
    while (this.purchaseRows.length < 6) {
      this.addRow();
    }
    
    // Fill rooms cost table
    this.fillRoomsCostTable();

    // Load payment schedules from backend API
    this.paymentScheduleRows = [];
    if (invoice.id) {
      this.loadPaymentSchedules(String(invoice.id));
    } else if (invoice.paymentSchedules && Array.isArray(invoice.paymentSchedules)) {
      // Fallback: Load from invoice object if API fails
      for (const payment of invoice.paymentSchedules) {
        const paymentRow: PaymentScheduleRow = {
          id: this.generateId(),
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : null,
          dayName: '',
          amount: payment.amount ?? null,
          vat: payment.vat ?? null,
          notes: payment.notes || null,
          isSaved: true // Loaded from invoice, so marked as saved
        };
        
        // Calculate day name
        if (paymentRow.paymentDate) {
          const date = new Date(paymentRow.paymentDate);
          paymentRow.dayName = this.getDayName(date.getDay());
        }
        
        this.paymentScheduleRows.push(paymentRow);
      }
    }
    
    // Ensure at least 5 payment rows in view mode
    while (this.paymentScheduleRows.length < 5) {
      this.addPaymentRow();
    }
    

  }

  loadInvoiceData(): void {
    if (!this.currentInvoiceId) return;
    this.reservationService.getPurchaseById(this.currentInvoiceId).subscribe({
      next: (invoice: any) => {
        this.loadInvoice(invoice);
      },
      error: () => {
        console.error('Failed to reload invoice data');
      }
    });
  }

 canGoNext(): boolean {
  if (this.viewSingleInvoice()) return false;
  return this.currentInvoiceIndex() < this.allInvoices.length - 1;
}

canGoPrevious(): boolean {
  if (this.viewSingleInvoice()) return false;
  return this.currentInvoiceIndex() > 0;
}

nextInvoice(): void {
  if (this.viewSingleInvoice()) return;
  const current = this.currentInvoiceIndex();
  if (current < this.allInvoices.length - 1) {
    this.currentInvoiceIndex.set(current + 1);
    this.loadInvoice(this.allInvoices[current + 1]);
  }
}

previousInvoice(): void {
  if (this.viewSingleInvoice()) return;
  const current = this.currentInvoiceIndex();
  if (current > 0) {
    this.currentInvoiceIndex.set(current - 1);
    this.loadInvoice(this.allInvoices[current - 1]);
  }
}

getCurrentInvoiceNumber(): string {
  if (this.viewSingleInvoice()) return `1 / 1`;
  return `${this.currentInvoiceIndex() + 1} / ${this.allInvoices.length}`;
}

getInvoiceFinalTotal(inv: any): number | null {
  if (!inv) return null;

  const subTotal = Number(inv.totalCostBeforeVAT ?? 0);
  const taxRate = Number(inv.tax ?? 0);
  const discount = Number(inv.discount ?? 0);

  if (!inv.totalCostBeforeVAT && !subTotal) return null;

  const taxAmount = (subTotal * taxRate) / 100;
  return subTotal + taxAmount - discount;
}

  closePurchaseDialog(): void {
    if (this.showPurchaseDialog()) {
      this.showPurchaseDialog.set(false);
      this.isViewMode.set(false);
      this.purchaseForm.reset({
        currency: 'SAR',
        issueDate: new Date(),
        dueDate: new Date(),
        taxRate: 0,
        discount: 0,
        isFrontal: this.isFrontal
      });
      this.purchaseRows = [];
      this.paymentScheduleRows = [];
      this.allInvoices = [];
      this.currentInvoice = null;
      this.currentInvoiceIndex.set(0);

      const hasIdOrNew = this.router.url.includes('/new') || !!this.route.snapshot.paramMap.get('id');
      if (hasIdOrNew) {
        this.router.navigate([this.isFrontal ? '/frontal-reservation-purchases' : '/reservation-purchases']);
      }
    }
  }

  addRow(): void {
    const newRow: PurchaseRow = {
      id: this.generateId(),
      fromDate: null,
      toDate: null,
      numberOfDays: 0,
      numberOfRooms: null,
      roomTypeId: null,
      mealId: null,
      mealCost: null,
      viewId: null,
      viewCost: null,
      satCount: 0,
      sunCount: 0,
      monCount: 0,
      tueCount: 0,
      wedCount: 0,
      thuCount: 0,
      friCount: 0,
      satCost: null,
      sunCost: null,
      monCost: null,
      tueCost: null,
      wedCost: null,
      thuCost: null,
      friCost: null,
      totalCost: 0,
    };
    this.purchaseRows = [...this.purchaseRows, newRow];
    this.fillRoomsCostTable();
  }

  removeRow(rowId: string): void {
    this.purchaseRows = this.purchaseRows.filter(r => r.id !== rowId);
    this.fillRoomsCostTable();
  }

  addPaymentRow(): void {
    const newRow: PaymentScheduleRow = {
      id: this.generateId(),
      paymentDate: null,
      dayName: '',
      amount: null,
      vat: null,
      notes: null,
      isSaved: false // New payment row, not yet saved
    };
    this.paymentScheduleRows = [...this.paymentScheduleRows, newRow];
  }

  removePaymentRow(rowId: string): void {
    const row = this.paymentScheduleRows.find(r => r.id === rowId);
    if (!row) return;

    if (row.isSaved) {
      if (row.isPaid) {
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'لا يمكن حذف دفعة تم إنشاء سند صرف لها' });
        return;
      }
      
      this.confirmationService.confirm({
        message: 'هل أنت متأكد من حذف هذه الدفعة من قاعدة البيانات؟',
        header: 'تأكيد الحذف',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.paymentService.deletePayment(row.id).subscribe({
            next: () => {
              this.paymentScheduleRows = this.paymentScheduleRows.filter(r => r.id !== rowId);
              this.messageService.add({ severity: 'success', summary: 'نجاح', detail: 'تم حذف الدفعة بنجاح' });
            },
            error: (err) => {
              this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء حذف الدفعة' });
            }
          });
        }
      });
    } else {
      this.paymentScheduleRows = this.paymentScheduleRows.filter(r => r.id !== rowId);
    }
  }
// ✅ View mode is ALWAYS read-only - no editing allowed when viewing invoices
isReadOnly(): boolean {
  return this.isViewMode();
}

// No editing allowed in view mode at all
canEdit(): boolean {
  return !this.isViewMode();
}

  onPaymentDateChange(row: PaymentScheduleRow): void {
    if (row.paymentDate) {
      const date = new Date(row.paymentDate);
      row.dayName = this.getDayName(date.getDay());
    } else {
      row.dayName = '';
    }
  }
  private buildPutPayload(isCanceledOverride?: boolean): any {
  if (!this.currentInvoice) return null;

  const formValues = this.purchaseForm.value;

  // ✅ rooms: لازم نحافظ على id القادم من API لو موجود
  const apiRooms: any[] = Array.isArray(this.currentInvoice.hotelAllotmentRooms)
    ? this.currentInvoice.hotelAllotmentRooms
    : [];

  const hotelAllotmentRooms = this.purchaseRows
    .filter(r => r.fromDate && r.toDate && r.roomTypeId && r.numberOfRooms != null)
    .map((row, idx) => {
      const apiRoom = apiRooms[idx]; // نفس ترتيب العرض (كما انت بتعمل loadInvoice)
  const extrasPerDay = (row.mealCost ?? 0) + (row.viewCost ?? 0);

const pricePerDay: Record<string, number> = {
  Saturday: row.satCost ?? 0,
  Sunday: row.sunCost ?? 0,
  Monday: row.monCost ?? 0,
  Tuesday: row.tueCost ?? 0,
  Wednesday: row.wedCost ?? 0,
  Thursday: row.thuCost ?? 0,
  Friday: row.friCost ?? 0,
};


      const rooms = row.numberOfRooms ?? 0;
      const roomsPerDay: Record<string, number> = {
        Saturday: rooms,
        Sunday: rooms,
        Monday: rooms,
        Tuesday: rooms,
        Wednesday: rooms,
        Thursday: rooms,
        Friday: rooms,
      };

      const fromDate = new Date(row.fromDate!);
      const toDate = new Date(row.toDate!);

      const roomPayload: any = {
        id: apiRoom?.id ?? 0,                // ✅ مهم لـ PUT
        roomTypeId: row.roomTypeId,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        pricePerDay,
        roomsPerDay,
        mealPlanId: row.mealId ?? null,
        viewId: row.viewId ?? null,
        mealPlanCost: row.mealCost ?? 0,
        viewCost: row.viewCost ?? 0,
        numberOfRooms: rooms
      };

      return roomPayload;
    });

  // ✅ payments: حافظ على id لو موجود من API
  const apiPays: any[] = Array.isArray(this.currentInvoice.paymentSchedules)
    ? this.currentInvoice.paymentSchedules
    : [];

  const paymentSchedules = this.paymentScheduleRows
    .filter(p => p.paymentDate && p.amount != null)
    .map((row, idx) => {
      const apiPay = apiPays[idx];
      return {
        id: apiPay?.id ?? row.id ?? null, // لو api id مش موجود
        paymentDate: row.paymentDate ? new Date(row.paymentDate).toISOString() : null,
        amount: row.amount ?? 0,
        vat: row.vat ?? 0,
        notes: row.notes ?? null
      };
    });

  // totals مطلوبة في PUT schema
  const totalCostBeforeVAT = Number(this.getGrandTotal() ?? 0);

  const totalNumberOfRooms = hotelAllotmentRooms.reduce((sum, r) => {
    // لو numberOfRooms موجود:
    return sum + Number(r.numberOfRooms ?? 0);
  }, 0);

  const totalNumberOfDays = this.purchaseRows.reduce((sum, r) => sum + Number(r.numberOfDays ?? 0), 0);

  const payload: any = {
    id: this.currentInvoice?.id ?? this.currentInvoiceId ?? 0,
    hotelId: formValues.hotelId,
    mainAccountId: formValues.mainAccountId,
    issueDate: formValues.issueDate?.toISOString(),
    dueDate: formValues.dueDate?.toISOString(),
    tax: Number(this.getTaxRate() ?? 0),
    discount: Number(this.getDiscountAmount() ?? 0),
    currency: formValues.currency || 'SAR',
    description: formValues.description ?? null,

    totalNumberOfRooms,
    totalNumberOfDays,
    totalCostBeforeVAT,

    hotelAllotmentRooms,
    paymentSchedules,

    taxRate: Number(this.getTaxRate() ?? 0),

    isCanceled: typeof isCanceledOverride === 'boolean'
      ? isCanceledOverride
      : !!this.currentInvoice?.isCanceled
  };

  return payload;
}

isCurrentInvoiceCanceled(): boolean {
  return !!this.currentInvoice?.isCanceled;
}
private cancelInvoiceApi(invoiceId: any): void {
  this.loading.set(true);

  const payload = this.buildPutPayload(true);
  if (!payload) {
    this.loading.set(false);
    this.showError('تعذر بناء بيانات الإلغاء');
    return;
  }

  (this.reservationService as any).updateHotelAllotmentInvoice(payload).subscribe({
    next: (res: any) => {
      // ✅ حدّث الفاتورة الحالية (عشان البادج يبان فورًا)
      this.currentInvoice = { ...this.currentInvoice, isCanceled: true };

      // ✅ حدّث preview list (عشان الصف الخارجي يبقى أحمر)
      const updatedPreview = this.previewInvoices().map(inv => {
        const invId = inv?.id || inv?.hotelAllotmentInvoiceId;
        return invId === invoiceId ? { ...inv, isCanceled: true } : inv;
      });
      this.previewInvoices.set(updatedPreview);

      // ✅ حدّث allInvoices لو فيه تنقل
      if (this.allInvoices?.length) {
        this.allInvoices = this.allInvoices.map(inv => {
          const invId = inv?.id || inv?.hotelAllotmentInvoiceId;
          return invId === invoiceId ? { ...inv, isCanceled: true } : inv;
        });
      }

      this.showSuccess('تم إلغاء الفاتورة بنجاح');
      this.loading.set(false);
    },
    error: (err: any) => {
      console.error(err);
      this.loading.set(false);
      this.showError('حدث خطأ أثناء إلغاء الفاتورة');
    }
  });
}

onUpdatePurchase(): void {
  if (!this.currentInvoice) return;

  // لو الفورم invalid
  if (this.purchaseForm.invalid) {
    Object.keys(this.purchaseForm.controls).forEach(k => this.purchaseForm.get(k)?.markAsTouched());
    this.showWarn('من فضلك راجع البيانات المطلوبة');
    return;
  }

  this.loading.set(true);

  const payload = this.buildPutPayload(); // يحفظ نفس isCanceled الحالي
  if (!payload) {
    this.loading.set(false);
    this.showError('تعذر بناء بيانات الحفظ');
    return;
  }

  (this.reservationService as any).updateHotelAllotmentInvoice(payload).subscribe({
    next: (res: any) => {
      // ✅ حدث currentInvoice من response لو بيرجع object كامل
      // لو بيرجع true/ok فقط، سيب currentInvoice كما هو
      if (res && typeof res === 'object') {
        this.currentInvoice = res;
      } else {
        this.currentInvoice = { ...this.currentInvoice, ...payload };
      }

      // ✅ حدث preview list (لو اتغير description/amounts/currency... الخ)
      const id = payload.id;
      const updatedPreview = this.previewInvoices().map(inv => {
        const invId = inv?.id || inv?.hotelAllotmentInvoiceId;
        return invId === id ? { ...inv, ...this.currentInvoice } : inv;
      });
      this.previewInvoices.set(updatedPreview);

      if (this.allInvoices?.length) {
        this.allInvoices = this.allInvoices.map(inv => {
          const invId = inv?.id || inv?.hotelAllotmentInvoiceId;
          return invId === id ? { ...inv, ...this.currentInvoice } : inv;
        });
      }

      // تحديث قائمة الفواتير من السيرفر للتأكد من الحصول على أحدث البيانات
      this.loadPurchasesPreview();

      const hasTransaction = !!(this.currentInvoice?.transactionId);
      const msg = hasTransaction 
        ? (this.activeLanguage === 'ar' ? 'تم حفظ الفاتورة وتحديث القيد المحاسبي المربوط بها بنجاح' : 'Invoice saved and linked accounting entry updated successfully')
        : (this.activeLanguage === 'ar' ? 'تم حفظ الفاتورة بنجاح' : 'Invoice saved successfully');
      this.showSuccess(msg);
      this.loading.set(false);
    },
    error: (err: any) => {
      console.error(err);
      this.loading.set(false);
      this.showError('حدث خطأ أثناء حفظ الفاتورة');
    }
  });
}

canEditHeader(): boolean {
  return false; // Never allow editing in view mode
}
cancelInvoiceUI(): void {
  if (!this.currentInvoice) return;

  const invoiceId =
    this.currentInvoice?.id ||
    this.currentInvoice?.hotelAllotmentInvoiceId ||
    this.currentInvoiceId;

  if (!invoiceId) {
    this.showError('لم يتم العثور على رقم الفاتورة لإلغاءها');
    return;
  }

  // لو ملغاة بالفعل
  if (this.currentInvoice?.isCanceled) {
    this.showWarn('هذه الفاتورة ملغاة بالفعل');
    return;
  }

  this.confirmationService.confirm({
    header: 'تأكيد الإلغاء',
    message: 'هل أنت متأكد من أنك تريد إلغاء هذه الفاتورة؟',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'تأكيد',
    rejectLabel: 'لا',
    acceptButtonStyleClass: 'p-button-danger',
    rejectButtonStyleClass: 'p-button-secondary p-button-text',

    accept: () => {
      this.cancelInvoiceApi(invoiceId);
    },
    reject: () => {
      // لا نغيّر أي شيء
      this.messageService.add({
        severity: 'info',
        summary: 'تم الإلغاء',
        detail: 'لم يتم إلغاء الفاتورة',
      });
    }
  });
}


  onDateChange(row: PurchaseRow): void {
    if (row.fromDate && row.toDate) {
      // Calculate days including both from and to dates
      const fromDate = new Date(row.fromDate);
      const toDate = new Date(row.toDate);
      // Reset time to start of day for accurate calculation
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      // Add 1 to include both from and to dates
      row.numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      this.calculateDayCounts(row);
    } else {
      row.numberOfDays = 0;
      row.satCount = 0;
      row.sunCount = 0;
      row.monCount = 0;
      row.tueCount = 0;
      row.wedCount = 0;
      row.thuCount = 0;
      row.friCount = 0;
    }
    this.calculateRowTotal(row);
    this.fillRoomsCostTable();
  }

  // calculateDayCounts(row: PurchaseRow): void {
  //   row.satCount = 0;
  //   row.sunCount = 0;
  //   row.monCount = 0;
  //   row.tueCount = 0;
  //   row.wedCount = 0;
  //   row.thuCount = 0;
  //   row.friCount = 0;

  //   if (!row.fromDate || !row.toDate) {
  //     return;
  //   }

  //   let currentDate = new Date(row.fromDate);
  //   const end = new Date(row.toDate);
  //   // Include the end date (<= instead of <)
  //   while (currentDate <= end) {
  //     const day = currentDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  //     switch (day) {
  //       case 6: row.satCount++; break;
  //       case 0: row.sunCount++; break;
  //       case 1: row.monCount++; break;
  //       case 2: row.tueCount++; break;
  //       case 3: row.wedCount++; break;
  //       case 4: row.thuCount++; break;
  //       case 5: row.friCount++; break;
  //     }
  //     currentDate.setDate(currentDate.getDate() + 1);
  //   }
  // }
calculateDayCounts(row: PurchaseRow): void {
  // ✅ المطلوب: أعمدة "عدد أيام ..." تتحول لعدد الغرف لكل يوم (ثابت)
  const rooms = row.numberOfRooms ?? 0;

  // لو مفيش تواريخ أو مفيش غرف، صفّر
  const hasValidDates = !!row.fromDate && !!row.toDate && row.numberOfDays > 0;
  const value = hasValidDates ? rooms : 0;

  row.satCount = value;
  row.sunCount = value;
  row.monCount = value;
  row.tueCount = value;
  row.wedCount = value;
  row.thuCount = value;
  row.friCount = value;
}

  onMealChange(row: PurchaseRow): void {
    if (!row.mealId) {
      row.mealCost = null;
    }
    this.calculateRowTotal(row);
    this.fillRoomsCostTable();
  }

  // validateNumberOfRooms(row: PurchaseRow): void {
  //   if (row.numberOfRooms !== null && row.numberOfRooms < 1) {
  //     row.numberOfRooms = 1;
  //   }
  //   if (row.numberOfRooms !== null && row.numberOfRooms > 999) {
  //     row.numberOfRooms = 999;
  //   }
  //   this.calculateRowTotal(row);
  //   this.fillRoomsCostTable();
  // }
validateNumberOfRooms(row: PurchaseRow): void {
  if (row.numberOfRooms !== null && row.numberOfRooms < 1) {
    row.numberOfRooms = 1;
  }
  if (row.numberOfRooms !== null && row.numberOfRooms > 999) {
    row.numberOfRooms = 999;
  }

  // ✅ حدّث أعمدة "عدد الأيام" لتساوي عدد الغرف
  this.calculateDayCounts(row);

  this.calculateRowTotal(row);
  this.fillRoomsCostTable();
}

  onNumberOfDaysChange(row: PurchaseRow): void {
    if (row.fromDate && row.numberOfDays && row.numberOfDays > 0) {
      // Calculate toDate based on fromDate and numberOfDays
      // numberOfDays includes both from and to dates, so we subtract 1
      const fromDate = new Date(row.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + (row.numberOfDays - 1));
      row.toDate = toDate;
      this.calculateDayCounts(row);
      this.calculateRowTotal(row);
      this.fillRoomsCostTable();
    }
}

  onCostChange(row: PurchaseRow): void {
    this.calculateRowTotal(row);
    this.fillRoomsCostTable();
  }

  calculateRowTotal(row: PurchaseRow): void {
    if (!row.fromDate || !row.toDate || row.numberOfDays <= 0) {
      row.totalCost = 0;
      return;
    }

    let total = 0;
    let currentDate = new Date(row.fromDate);
    const end = new Date(row.toDate);

    // Loop through days to calculate sum based on day of week
    while (currentDate <= end) { // Include both from and to dates
       const day = currentDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
       let dayCost = 0;
       
       switch(day) {
         case 6: dayCost = row.satCost ?? 0; break;
         case 0: dayCost = row.sunCost ?? 0; break;
         case 1: dayCost = row.monCost ?? 0; break;
         case 2: dayCost = row.tueCost ?? 0; break;
         case 3: dayCost = row.wedCost ?? 0; break;
         case 4: dayCost = row.thuCost ?? 0; break;
         case 5: dayCost = row.friCost ?? 0; break;
       }
       
       total += dayCost;
       currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add meal and view cost per day? Or is it per stay?
    // Assuming meal and view costs are per day (common in hotels).
    // The previous code was: row.totalCost = dayCosts + mealCost + viewCost. 
    // Wait, the previous code had "dayCosts = sat + sun + ...". That assumes one week or just sums the inputs.
    // The inputs are "Cost for Saturday", "Cost for Sunday".
    // If stay is 2 weeks, Saturday cost is applied twice.
    // I'll assume the input fields represent the "Rate per specific day of week".
    // So total = Sum(Rate(day) * RoomsCount) + (MealCost * RoomsCount * Days) + (ViewCost * RoomsCount * Days)
    
    // Let's re-read the previous code logic:
    // row.totalCost = dayCosts + (row.mealCost || 0) + (row.viewCost || 0);
    // This looks like it was just summing the input fields, which might be wrong if date range > 1 week or < 1 week.
    
    // Correct logic:
    const extrasPerDay = (row.mealCost ?? 0) + (row.viewCost ?? 0);
    const rooms = row.numberOfRooms ?? 1;
    
    // Total = (RoomRateSum + (Extras * Days)) * Rooms
    row.totalCost = (total + (extrasPerDay * row.numberOfDays)) * rooms;
  }

getGrandTotal(): number {
  // ✅ عرض فقط (تنقل بين فواتير): اعرض رقم الـ API
  if (this.isViewMode() && this.currentInvoice && !this.viewSingleInvoice()) {
    return Number(this.currentInvoice.totalCostBeforeVAT ?? 0);
  }

  // ✅ إضافة/تعديل (أو View Single مع حفظ): احسب من الـ rows
  return this.purchaseRows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0);
}



  getTaxRate(): number {
    return this.purchaseForm.get('taxRate')?.value ?? 0;
  }

  getTaxAmount(): number {
  if (this.isViewMode() && this.currentInvoice && !this.viewSingleInvoice()) {
    const subTotal = Number(this.currentInvoice.totalCostBeforeVAT ?? 0);
    const taxRate = Number(this.currentInvoice.tax ?? 0);
    return (subTotal * taxRate) / 100;
  }

  // ✅ تعديل/إضافة: احسب من taxRate
  const subTotal = this.getGrandTotal();
  const taxRate = this.getTaxRate();
  return (subTotal * taxRate) / 100;
}


  getDiscountAmount(): number {
    return this.purchaseForm.get('discount')?.value ?? 0;
  }

  getFinalTotal(): number {
    if (this.isViewMode() && this.currentInvoice) {
      const subTotal = Number(this.currentInvoice.totalCostBeforeVAT ?? this.currentInvoice.subTotal ?? 0);
      const taxRate = Number(this.currentInvoice.tax ?? 0);
      const taxAmount = (subTotal * taxRate) / 100;
      const discount = Number(this.currentInvoice.discount ?? 0);
      return subTotal + taxAmount - discount;
    }

    const subTotal = this.getGrandTotal();
    const taxAmount = this.getTaxAmount();
    const discountAmount = this.getDiscountAmount();
    return subTotal + taxAmount - discountAmount;
  }



  getPaymentScheduleAmountTotal(): number {
    return this.paymentScheduleRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  }

  getPaymentScheduleTotal(): number {
    return this.paymentScheduleRows.reduce((sum, row) => sum + (row.amount ?? 0) + (row.vat ?? 0), 0);
  }

  getPaymentSchedulePaidTotal(): number {
    return this.paymentScheduleRows
      .filter(row => row.isPaid)
      .reduce((sum, row) => sum + (row.amount ?? 0) + (row.vat ?? 0), 0);
  }

  getPaymentScheduleUnpaidTotal(): number {
    return Math.max(0, this.getFinalTotal() - this.getPaymentSchedulePaidTotal());
  }

  getRemainingToSchedule(): number {
    return Math.max(0, this.getFinalTotal() - this.getPaymentScheduleTotal());
  }

  /**
   * Calculate total amount paid (from backend invoice data)
   */
  getTotalPaid(): number {
    return Number(this.currentInvoice?.paidAmount ?? 0);
  }

  /**
   * Calculate remaining balance (Final Total - Total Paid)
   */
  getRemainingBalance(): number {
    const finalTotal = this.getFinalTotal();
    const totalPaid = this.getTotalPaid();
    return Math.max(0, finalTotal - totalPaid);
  }

  /**
   * Determine payment status based on total paid vs final total
   */
  getPaymentStatus(): PaymentStatus {
    const finalTotal = this.getFinalTotal();
    const totalPaid = this.getTotalPaid();

    if (totalPaid === 0) {
      return PaymentStatus.NotPaid;
    } else if (totalPaid >= finalTotal) {
      return PaymentStatus.FullyPaid;
    } else {
      return PaymentStatus.PartiallyPaid;
    }
  }

  /**
   * Check if invoice is fully paid
   */
  isFullyPaid(): boolean {
    return this.getPaymentStatus() === PaymentStatus.FullyPaid;
  }

  /**
   * Get payment status label in Arabic
   */
  getPaymentStatusLabel(): string {
    const status = this.getPaymentStatus();
    switch (status) {
      case PaymentStatus.NotPaid:
        return 'غير مدفوع';
      case PaymentStatus.PartiallyPaid:
        return 'مدفوع جزئياً';
      case PaymentStatus.FullyPaid:
        return 'مدفوع بالكامل';
      default:
        return '';
    }
  }

  /**
   * Get payment status CSS class
   */
  getPaymentStatusClass(): string {
    const status = this.getPaymentStatus();
    switch (status) {
      case PaymentStatus.NotPaid:
        return 'status-not-paid';
      case PaymentStatus.PartiallyPaid:
        return 'status-partially-paid';
      case PaymentStatus.FullyPaid:
        return 'status-fully-paid';
      default:
        return '';
    }
  }

  getPaymentScheduleVatTotal(): number {
    return this.paymentScheduleRows.reduce((sum, row) => sum + (row.vat ?? 0), 0);
  }

  onSavePurchase(): void {
    // Validate form fields
    if (this.purchaseForm.invalid) {
      Object.keys(this.purchaseForm.controls).forEach(key => {
        this.purchaseForm.get(key)?.markAsTouched();
      });
      
      // Show detailed bilingual validation messages
      const missingFields: string[] = [];
      const missingFieldsAr: string[] = [];
      
      if (this.purchaseForm.get('hotelId')?.hasError('required')) {
        missingFields.push('Hotel');
        missingFieldsAr.push('الفندق');
      }
      if (this.purchaseForm.get('mainAccountId')?.hasError('required')) {
        missingFields.push('Account');
        missingFieldsAr.push('الحساب');
      }
      if (this.purchaseForm.get('issueDate')?.hasError('required')) {
        missingFields.push('Issue Date');
        missingFieldsAr.push('تاريخ الإصدار');
      }
      if (this.purchaseForm.get('dueDate')?.hasError('required')) {
        missingFields.push('Due Date');
        missingFieldsAr.push('تاريخ الاستحقاق');
      }
      
      if (missingFields.length > 0) {
        const messageEn = `Please fill required fields: ${missingFields.join(', ')}`;
        const messageAr = `يرجى ملء الحقول المطلوبة: ${missingFieldsAr.join('، ')}`;
        this.showError(`${messageAr}\n${messageEn}`);
      } else {
        this.showError('يرجى ملء جميع الحقول المطلوبة\nPlease fill all required fields');
      }
      return;
    }

    // Validate at least one purchase row exists
    if (this.purchaseRows.length === 0) {
      this.showWarn('يجب إضافة صف واحد على الأقل\nAt least one row must be added');
      return;
    }
    
    // Validate purchase rows have required data
    const validRows = this.purchaseRows.filter(
      row => row.fromDate && row.toDate && row.roomTypeId && row.numberOfRooms
    );
    
    if (validRows.length === 0) {
      this.showError(
        'يرجى ملء بيانات الغرف: التاريخ من/إلى، نوع الغرفة، وعدد الغرف\n' +
        'Please fill room details: From/To Date, Room Type, and Number of Rooms'
      );
      return;
    }
    
    // Validate each row has required fields
    let hasInvalidRow = false;
    let invalidRowIndex = -1;
    
    for (let i = 0; i < this.purchaseRows.length; i++) {
      const row = this.purchaseRows[i];
      
      // Skip empty rows
      if (!row.fromDate && !row.toDate && !row.roomTypeId && !row.numberOfRooms) {
        continue;
      }
      
      // Check if row has some data but missing required fields
      if (!row.fromDate || !row.toDate || !row.roomTypeId || !row.numberOfRooms) {
        hasInvalidRow = true;
        invalidRowIndex = i + 1;
        break;
      }
      
      // Validate date range
      if (row.fromDate && row.toDate && row.fromDate > row.toDate) {
        this.showError(
          `الصف ${invalidRowIndex}: تاريخ البداية يجب أن يكون قبل تاريخ النهاية\n` +
          `Row ${invalidRowIndex}: From Date must be before To Date`
        );
        return;
      }
      
      // Validate number of rooms is positive
      if (row.numberOfRooms && row.numberOfRooms <= 0) {
        this.showError(
          `الصف ${invalidRowIndex}: عدد الغرف يجب أن يكون أكبر من صفر\n` +
          `Row ${invalidRowIndex}: Number of Rooms must be greater than zero`
        );
        return;
      }
    }
    
    if (hasInvalidRow) {
      this.showError(
        `الصف ${invalidRowIndex}: يرجى ملء جميع الحقول المطلوبة (التاريخ من/إلى، نوع الغرفة، عدد الغرف)\n` +
        `Row ${invalidRowIndex}: Please fill all required fields (From/To Date, Room Type, Number of Rooms)`
      );
      return;
    }

    // Validate discount does not exceed subtotal
    const discount = this.getDiscountAmount();
    const subtotal = this.getGrandTotal();
    if (discount > subtotal) {
      this.showWarn(
        'الخصم يتجاوز اجمالي المبلغ قبل الضريبة. تم تعديل قيمة الخصم تلقائياً\n' +
        'Discount exceeds total before tax. Discount has been adjusted automatically.'
      );
      this.purchaseForm.patchValue({ discount: subtotal });
    }

    this.loading.set(true);
    
    const formValues = this.purchaseForm.value;

    const hotelAllotmentRooms = this.purchaseRows
      .filter(row => row.fromDate && row.toDate && row.roomTypeId && row.numberOfRooms)
      .map(row => {
       // Send single day price only (not multiplied by number of days)
       const pricePerDay: Record<string, number> = {};
       const roomsPerDay: Record<string, number> = {};
       
       // Get base day costs (single day price)
       const satCost = row.satCost ?? 0;
       const sunCost = row.sunCost ?? 0;
       const monCost = row.monCost ?? 0;
       const tueCost = row.tueCost ?? 0;
       const wedCost = row.wedCost ?? 0;
       const thuCost = row.thuCost ?? 0;
       const friCost = row.friCost ?? 0;
       
        // Set price per day (single day price only)
        pricePerDay['Saturday'] = satCost;
        pricePerDay['Sunday'] = sunCost;
        pricePerDay['Monday'] = monCost;
        pricePerDay['Tuesday'] = tueCost;
        pricePerDay['Wednesday'] = wedCost;
        pricePerDay['Thursday'] = thuCost;
        pricePerDay['Friday'] = friCost;
       
       // Set rooms per day (single value for all days)
       const numberOfRooms = row.numberOfRooms ?? 0;
       roomsPerDay['Saturday'] = numberOfRooms;
       roomsPerDay['Sunday'] = numberOfRooms;
       roomsPerDay['Monday'] = numberOfRooms;
       roomsPerDay['Tuesday'] = numberOfRooms;
       roomsPerDay['Wednesday'] = numberOfRooms;
       roomsPerDay['Thursday'] = numberOfRooms;
       roomsPerDay['Friday'] = numberOfRooms;

       const fromDateISO = row.fromDate ? new Date(row.fromDate).toISOString() : undefined;
       const toDateISO = row.toDate ? new Date(row.toDate).toISOString() : undefined;
       
       const roomData: any = {
         roomTypeId: row.roomTypeId,
         fromDate: fromDateISO,
         toDate: toDateISO,
         pricePerDay: pricePerDay,
         roomsPerDay: roomsPerDay,
         numberOfRooms: numberOfRooms
       };
       
       // Add optional fields only if they have values
       if (row.mealId) {
         roomData.mealPlanId = row.mealId;
       }
        if (row.viewId) {
          roomData.viewId = row.viewId;
        }
        roomData.mealPlanCost = row.mealCost ?? 0;
        roomData.viewCost = row.viewCost ?? 0;
        
        return roomData;
    });

    // Calculate values from Summary Section
    // totalPrice = Subtotal (الإجمالي الفرعي) - calculated from purchase rows
    const totalPrice = this.getGrandTotal();
    
    // taxAmount = Tax Amount (مبلغ الضريبة) - calculated from subtotal × taxRate
    const taxAmount = this.getTaxAmount();
    
    // discountAmount = Discount Amount (مبلغ الخصم) - from discount input field
    const discountAmount = this.getDiscountAmount();
    
    // netPrice = Final Total (الإجمالي النهائي) - calculated: subtotal + tax - discount
    const netPrice = totalPrice + taxAmount - discountAmount;

    // Prepare payment schedules
    const validPayments = this.paymentScheduleRows.filter(
      row => row.paymentDate && row.amount !== null && row.amount !== undefined
    );

    const paymentSchedules = validPayments.map(row => {
      const paymentDate = row.paymentDate ? new Date(row.paymentDate) : null;
      return {
        paymentDate: paymentDate ? paymentDate.toISOString() : null,
        paymentDay: row.dayName || '',
        amount: row.amount ?? 0,
        vat: row.vat ?? 0,
        notes: row.notes || null
      };
    });

    // Build payload - remove null/undefined values and ensure proper formatting
    const payload: any = {
      hotelId: formValues.hotelId,
      mainAccountId: formValues.mainAccountId,
      hotelAllotmentRooms: hotelAllotmentRooms,
      currency: formValues.currency || 'SAR',
      issueDate: formValues.issueDate?.toISOString(),
      dueDate: formValues.dueDate?.toISOString(),
      isFrontal: formValues.isFrontal || false,
      tax: formValues.taxRate || 0,
      discount: discountAmount || 0
    };
    
    // Add paymentSchedules only if there are valid payments
    if (paymentSchedules.length > 0) {
      payload.paymentSchedules = paymentSchedules;
    }
    
    // Add optional fields only if they have values
    if (formValues.invoiceNo) {
      payload.invoiceNo = formValues.invoiceNo;
    }
    if (formValues.description) {
      payload.description = formValues.description;
    }
    if (formValues.taxRate !== null && formValues.taxRate !== undefined) {
      payload.taxRate = formValues.taxRate;
    }
    
    // Remove undefined fields
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    
    console.log('Sending payload:', payload);

    // Check if we're editing an existing invoice or creating a new one
    const isEditing = !!this.currentInvoice?.id;
    
    if (isEditing) {
      // Update existing invoice
      const putPayload = this.buildPutPayload();
      if (!putPayload) {
        this.showError('حدث خطأ في بناء البيانات\nError building update payload');
        this.loading.set(false);
        return;
      }
      
      console.log('Updating invoice with PUT payload:', putPayload);
      this.reservationService.updateHotelAllotmentInvoice(putPayload).subscribe({
        next: (res: any) => {
          console.log('Invoice updated successfully:', res);
          this.loading.set(false);
          this.showSuccess('تم تحديث الفاتورة بنجاح!\nInvoice updated successfully!');
          
          // Reload the preview table to show the updated invoice
          this.loadPurchasesPreview();
          
          // Close dialog after a short delay to allow user to see the success message
          setTimeout(() => {
            this.closePurchaseDialog();
          }, 1000);
        },
        error: (err: any) => {
          console.error('Error updating invoice:', err);
          this.loading.set(false);
          const errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء تحديث الفاتورة\nError updating invoice';
          this.showError(errorMessage);
        }
      });
    } else {
      // Create new invoice
      (this.reservationService as any).createPurchase(payload).subscribe({
        next: (res) => {
          console.log('Invoice created successfully:', res);
          this.loading.set(false);
          this.showSuccess('تم إنشاء الفاتورة بنجاح!\nInvoice created successfully!');
          
          // Reload the preview table to show the new invoice
          this.loadPurchasesPreview();
          
          // Close dialog after a short delay to allow user to see the success message
          setTimeout(() => {
            this.closePurchaseDialog();
          }, 1000);
        },
        error: (err) => {
          console.error('Error creating invoice:', err);
          this.loading.set(false);
          const errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء حفظ الفاتورة\nError saving invoice';
          this.showError(errorMessage);
        }
      });
    }
  }

  private generateId(): string {
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  private pickName(obj: any): string {
    if (!obj) return '-';
    const ar = obj.arabicName ?? obj.nameAr ?? obj.arName ?? obj.displayNameAr ?? obj.displayNameArabic;
    const en = obj.englishName ?? obj.nameEn ?? obj.enName ?? obj.displayNameEn ?? obj.displayName;
    if (this.activeLanguage === 'ar') return ar || en || '-';
    return en || ar || '-';
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'تم بنجاح', detail });
  }

  private showWarn(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'خطأ', detail });
  }

}
