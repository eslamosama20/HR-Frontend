import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { DamagedInventoryModel } from '../../../models/inventory/damagedInventory.model';
import { DamagedInventoryService } from '../../../services/inventory/damaged-inventory.service';
import { StoreDetailsService } from '../../../services/inventory/store-details.service';
import { MainSalesClassService } from '../../../services/sales-classes-tree/main-sales-class.service';
import { StoreDetailsModel } from '../../../models/inventory/storeDetails.model';
import { MainSalesClassModel } from '../../../models/sales-classes-tree/mainSalesClass.model';
import { MainAccountModel } from '../../../models/accounting/mainAccount.model';
import { MainAccountService } from '../../../services/accounting/main-account.service';
import { InventoryPermitService } from '../../../services/permits/inventory-permit.service';
import { InventoryPermitModel } from '../../../models/permits/inventory-permit.model';
import { InventoryPermitEntryModel } from '../../../models/permits/inventory-permit-entry.model';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { environment } from 'src/environments/environment';
import { TranslateModule } from '@ngx-translate/core';
import { formatDateOnlyToString } from 'src/app/utils/dateUtils';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
interface ProductStockModel {
  productId: string;
  productName: string;
  productCode: string;
  availableQuantity: number;
  unitName: string;
  storeDetailsId: string;
  batchNo?: string | null;
  // حقول الصلاحية والموقع
  expiryDate: Date | string | null;
  shelfNumber: string;
  rowNumber: string;
  permitEntryId: string;
}

@Component({
  selector: 'app-damaged-inventory-list',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DropdownModule,
    CalendarModule,
    InputTextareaModule,
    InputNumberModule,
    ToastModule,
    TabViewModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './damaged-inventory-list.component.html',
  styleUrls: ['./damaged-inventory-list.component.scss'],
  providers: [MessageService]
})
export class DamagedInventoryListComponent implements OnInit {
  damagedItems = signal<DamagedInventoryModel[]>([]);
  loading = false;
  showDialog = false;

  // Form fields
  stores: StoreDetailsModel[] = [];
  products: ProductStockModel[] = [];
  allProducts: ProductStockModel[] = [];
  accounts: MainAccountModel[] = [];
  
  selectedStore: StoreDetailsModel | null = null;
  selectedProduct: ProductStockModel | null = null;
  quantity: number = 1;
  damageDate: Date = new Date();
  reason: string = '';
  reportedBy: string = '';
  searchText: string = '';

  // Share dialog
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

  constructor(
    private damagedInventoryService: DamagedInventoryService,
    private storeDetailsService: StoreDetailsService,
    private mainSalesClassService: MainSalesClassService,
    private mainAccountService: MainAccountService,
    private inventoryPermitService: InventoryPermitService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private http: HttpClient,
    private pdfUtils: PdfUtilsService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }

  loadInitialData(): void {
    this.loading = true;
    
    // Load damaged items first - this is the main data
    this.damagedInventoryService.getAll().subscribe({
      next: (items) => {
        const itemsArray = Array.isArray(items) ? items : [];
        this.damagedItems.set(itemsArray);
        console.log('Loaded damaged items:', itemsArray);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading damaged items', err);
        this.damagedItems.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل البيانات'
        });
        this.loading = false;
      }
    });

    // Load other data in parallel (not blocking)
    this.loadStores();
    this.loadAccounts();
  }

  loadStores(): void {
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        this.stores = stores.map(store => new StoreDetailsModel(store));
      },
      error: (err) => {
        console.error('Error loading stores', err);
      }
    });
  }

  loadAccounts(): void {
    this.mainAccountService.getAll().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
      },
      error: (err) => {
        console.error('Error loading accounts', err);
      }
    });
  }

  loadProducts(): void {
    // Load all products or implement your product loading logic
  }

  loadStoreProducts(storeId: string): void {
    if (!storeId) {
      this.products = [];
      return;
    }

    this.loading = true;
    this.products = []; // Clear previous products
    
    // Get permits filtered by store from backend
    this.inventoryPermitService.getByStoreId(storeId).subscribe({
      next: (permits) => {
        console.log('Store permits:', permits);
        
        if (!permits || !Array.isArray(permits)) {
          console.error('Permits is not an array:', permits);
          this.products = [];
          this.allProducts = [];
          this.loading = false;
          return;
        }

        // فلترة أذونات الدخول والخروج
        const entryPermits = permits.filter(p => p.permitType === 'Entry');
        const exitPermits = permits.filter(p => p.permitType === 'Exit');
        
        // بناء خريطة للكميات المخرجة (باستخدام unique key)
        const exitQuantities = new Map<string, number>();
        exitPermits.forEach(permit => {
          permit.permitEntries?.forEach((entry: any) => {
            const productId = entry.mainPurchaseClassId || entry.mainSalesClassId;
            if (productId) {
              const key = buildInventoryTrackingKey({
                productId,
                batchNo: normalizeBatchNo(entry.batchNo),
                expiryDate: entry.expiryDate,
                shelfNumber: entry.shelfNumber,
                rowNumber: entry.rowNumber
              });
              const current = exitQuantities.get(key) || 0;
              exitQuantities.set(key, current + (entry.quantity || 0));
            }
          });
        });

        // بناء قائمة المنتجات المتاحة (كل باتش منفصل)
        const productMap = new Map<string, ProductStockModel>();
        
        entryPermits.forEach(permit => {
          permit.permitEntries?.forEach((entry: any) => {
            const product = entry.mainPurchaseClass || entry.mainSalesClass;
            const productId = entry.mainPurchaseClassId || entry.mainSalesClassId;
            if (!product || !productId) return;
            
            // Unique key يشمل المنتج + تاريخ الصلاحية + الموقع
            const key = buildInventoryTrackingKey({
              productId,
              batchNo: normalizeBatchNo(entry.batchNo),
              expiryDate: entry.expiryDate,
              shelfNumber: entry.shelfNumber,
              rowNumber: entry.rowNumber
            });
            
            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.availableQuantity += entry.quantity || 0;
            } else {
              productMap.set(key, {
                productId: productId,
                productName: product.arabicName || 'غير محدد',
                productCode: product.referenceCode || '-',
                availableQuantity: entry.quantity || 0,
                unitName: product.measurementUnit?.arabicName || '-',
                storeDetailsId: storeId,
                batchNo: normalizeBatchNo(entry.batchNo),
                expiryDate: entry.expiryDate || null,
                shelfNumber: entry.shelfNumber || '',
                rowNumber: entry.rowNumber || '',
                permitEntryId: entry.id || ''
              });
            }
          });
        });
        
        // طرح الكميات المخرجة
        productMap.forEach((product, key) => {
          const exitQty = exitQuantities.get(key) || 0;
          product.availableQuantity -= exitQty;
        });

        // Convert map to array and filter positive quantities only
        const resultArray = Array.from(productMap.values()).filter(item => item.availableQuantity > 0);
        console.log('Store products with batches:', resultArray);
        
        this.products = resultArray;
        this.allProducts = resultArray;

        this.loading = false;
        
        if (this.products.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'معلومة',
            detail: 'لا توجد أصناف متاحة في هذا المخزن'
          });
        }
      },
      error: (err) => {
        console.error('Error loading store products', err);
        this.products = [];
        this.allProducts = [];
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل المنتجات'
        });
        this.loading = false;
      }
    });
  }

  loadDamagedItems(): void {
    this.loading = true;
    this.damagedInventoryService.getAll().subscribe({
      next: (items) => {
        // Ensure items is always an array
        const itemsArray = Array.isArray(items) ? items : [];
        this.damagedItems.set(itemsArray);
        console.log('Loaded damaged items:', itemsArray);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading damaged items', err);
        this.damagedItems.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل البيانات'
        });
        this.loading = false;
      }
    });
  }

  openAddDialog(): void {
    this.resetForm();
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.resetForm();
  }

  onSearchProduct(): void {
    if (!this.searchText.trim()) {
      this.products = this.allProducts;
      return;
    }
    const search = this.searchText.toLowerCase();
    this.products = this.allProducts.filter(p =>
      p.productName.toLowerCase().includes(search) ||
      p.productCode.toLowerCase().includes(search)
    );
  }

  onStoreChange(): void {
    if (this.selectedStore) {
      this.loadStoreProducts(this.selectedStore.id!);
    } else {
      this.products = [];
    }
  }

  onProductSelect(product: ProductStockModel): void {
    this.selectedProduct = product;
  }

  validateForm(): boolean {
    if (!this.selectedStore) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى اختيار المخزن'
      });
      return false;
    }

    if (!this.selectedProduct) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى اختيار المنتج'
      });
      return false;
    }

    if (!this.quantity || this.quantity <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى إدخال كمية صحيحة'
      });
      return false;
    }

    if (this.quantity > this.selectedProduct.availableQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الكمية المدخلة أكبر من الكمية المتاحة'
      });
      return false;
    }

    return true;
  }

  saveDamagedItem(): void {
    if (!this.validateForm()) {
      return;
    }

    // التحقق من وجود حساب للإذن
    if (!this.accounts || this.accounts.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'لا يوجد حسابات متاحة لإنشاء إذن الخروج'
      });
      return;
    }

    this.loading = true;

    // تحويل تاريخ التلف لصيغة YYYY-MM-DD المطلوبة من الـ backend
    const formatDateOnly = (date: Date | string | null | undefined): string | undefined => {
      if (!date) return undefined;
      return formatDateOnlyToString(date) || undefined;
    };

    const permitDateFormatted = formatDateOnly(this.damageDate);
    const expiryDateFormatted = formatDateOnly(this.selectedProduct!.expiryDate);

    // 1. إنشاء إذن خروج لخصم الكمية من المخزون
    const exitPermit = new InventoryPermitModel();
    exitPermit.permitType = 'Exit';
    exitPermit.permitDate = permitDateFormatted as any; // Backend expects DateOnly as string
    exitPermit.storeDetailsId = this.selectedStore!.id!;
    exitPermit.mainAccountId = this.accounts[0].id!;
    exitPermit.description = `إذن خروج تلف - ${this.reason || 'بدون سبب'}`;
    exitPermit.referenceNumber = `DMG-${Date.now()}`;

    // إنشاء سجل إذن الخروج مع الصلاحية والموقع
    const exitEntry = new InventoryPermitEntryModel();
    exitEntry.mainPurchaseClassId = this.selectedProduct!.productId;
    exitEntry.quantity = this.quantity;
    exitEntry.unitPrice = 1; // يجب أن يكون أكبر من 0
    exitEntry.expiryDate = expiryDateFormatted as any; // Backend expects DateOnly
    exitEntry.batchNo = this.selectedProduct!.batchNo || undefined;
    exitEntry.shelfNumber = this.selectedProduct!.shelfNumber || undefined;
    exitEntry.rowNumber = this.selectedProduct!.rowNumber || undefined;

    exitPermit.permitEntries = [exitEntry];

    console.log('Creating exit permit:', {
      permitType: exitPermit.permitType,
      permitDate: exitPermit.permitDate,
      storeDetailsId: exitPermit.storeDetailsId,
      mainAccountId: exitPermit.mainAccountId,
      referenceNumber: exitPermit.referenceNumber,
      description: exitPermit.description,
      permitEntries: exitPermit.permitEntries.map(e => ({
        mainPurchaseClassId: e.mainPurchaseClassId,
        quantity: e.quantity,
        unitPrice: e.unitPrice,
        expiryDate: e.expiryDate,
        shelfNumber: e.shelfNumber,
        rowNumber: e.rowNumber
      }))
    });

    // إنشاء إذن الخروج أولاً
    this.inventoryPermitService.create(exitPermit).subscribe({
      next: (permitResponse) => {
        console.log('Exit permit created:', permitResponse);
        
        // 2. بعد إنشاء إذن الخروج، إنشاء سجل التالف
        const newDamaged = new DamagedInventoryModel();
        newDamaged.storeDetailsId = this.selectedStore!.id!;
        newDamaged.storeName = this.selectedStore!.arabicName;
        newDamaged.productId = this.selectedProduct!.productId;
        newDamaged.productName = this.selectedProduct!.productName;
        newDamaged.productCode = this.selectedProduct!.productCode;
        newDamaged.quantity = this.quantity;
        newDamaged.damageDate = this.damageDate;
        newDamaged.reason = this.reason;
        newDamaged.reportedBy = this.reportedBy;
        newDamaged.unitName = this.selectedProduct!.unitName;
        newDamaged.batchNo = this.selectedProduct!.batchNo;
        // إضافة بيانات الصلاحية والموقع
        newDamaged.expiryDate = this.selectedProduct!.expiryDate;
        newDamaged.shelfNumber = this.selectedProduct!.shelfNumber;
        newDamaged.rowNumber = this.selectedProduct!.rowNumber;
        newDamaged.exitPermitId = permitResponse?.id;

        this.damagedInventoryService.create(newDamaged).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'نجاح',
              detail: 'تم إضافة التالف وخصم الكمية من المخزون بنجاح'
            });
            this.closeDialog();
            this.loadDamagedItems();
          },
          error: (err) => {
            console.error('Error adding damaged item', err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تم إنشاء إذن الخروج لكن فشل حفظ سجل التالف'
            });
          },
          complete: () => {
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error creating exit permit:', err);
        console.error('Error details:', err?.error);
        const errorMessage = err?.error?.message || err?.error?.title || err?.message || 'فشل إنشاء إذن الخروج';
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: errorMessage
        });
        this.loading = false;
      }
    });
  }

  // ====================================
  // Export and Share Functions
  // ====================================

  exportToExcel(): void {
    if (!this.damagedItems() || this.damagedItems().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      // Prepare data for Excel export
      const data = this.damagedItems().map((item, index) => ({
        '#': index + 1,
        'اسم المنتج': item.productName || '',
        'كود المنتج': item.productCode || '',
        'المخزن': item.storeName || '',
        'الكمية التالفة': item.quantity || 0,
        'الوحدة': item.unitName || '',
        'سبب التلف': item.reason || '',
        'تاريخ التلف': item.damageDate ? this.formatDate(new Date(item.damageDate)) : '',
        'المسؤول عن البلاغ': item.reportedBy || '',
        'تاريخ الإنشاء': item.createdAt ? this.formatDate(new Date(item.createdAt)) : ''
      }));

      this.pdfUtils.exportToExcel(data, `تقرير_المخزون_التالف_${this.formatDateForFileName(new Date())}`);
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح التصدير',
        detail: 'تم تصدير الملف بنجاح'
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في التصدير',
        detail: 'فشل في تصدير الملف'
      });
    }
  }

  printPDF(): void {
    const base = environment.server_urls[environment.active_server];
    const url = `${base.baseApi}inventory/DamagedInventory/Report/damaged-document`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => this.pdfUtils.printBlob(blob),
      error: err => {
        console.error('Print error', err);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل طباعة التقرير' });
      }
    });
  }

  // Export PDF Function
  async exportToPdf(): Promise<void> {
    if (!this.damagedItems() || this.damagedItems().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      this.loading = true;
      
      const response = await this.http.get(
        `${environment.server_urls[environment.active_server].baseApi}inventory/damagedInventory/Report/damaged-document`,
        { 
          responseType: 'blob' as 'json'
        }
      ).toPromise() as Blob;

      if (response) {
        const fileName = `تقرير_المخزون_التالف_${this.formatDateForFileName(new Date())}.pdf`;
        this.pdfUtils.downloadFile(response, fileName);
        
        this.messageService.add({
          severity: 'success',
          summary: 'نجح التصدير',
          detail: 'تم تصدير التقرير بنجاح'
        });
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في التصدير',
        detail: 'فشل في تصدير التقرير'
      });
    } finally {
      this.loading = false;
    }
  }

  // Share Functions
  openShareDialog(): void {
    if (!this.damagedItems() || this.damagedItems().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    
    this.shareDialogVisible = true;
    this.shareActiveTabIndex = 0;
    this.shareForm.reset();
  }

  closeShareDialog(): void {
    this.shareDialogVisible = false;
    this.shareForm.reset();
  }

  async shareReport(): Promise<void> {
    if (!this.shareForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'بيانات غير صحيحة',
        detail: 'يرجى التحقق من البيانات المدخلة'
      });
      return;
    }

    try {
      this.shareBusy = true;
      const formData = this.shareForm.value;

      const shareData = {
        email: this.shareActiveTabIndex === 0 ? formData.email : null,
        whatsappNumber: this.shareActiveTabIndex === 1 ? formData.whatsappNumber : null,
        method: this.shareActiveTabIndex === 0 ? 'email' : 'whatsapp',
        receiver: this.shareActiveTabIndex === 0 ? formData.email : formData.whatsappNumber
      };

      const response = await this.http.post(
        `${environment.server_urls[environment.active_server].baseApi}inventory/damagedInventory/Report/damaged-share`,
        shareData
      ).toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'تم إرسال التقرير',
        detail: this.shareActiveTabIndex === 0 
          ? 'تم إرسال التقرير على البريد الإلكتروني'
          : 'تم إرسال التقرير على الواتساب'
      });

      // Handle WhatsApp links if any
      if (this.shareActiveTabIndex === 1) {
        const links = this.extractWhatsAppLinks(response);
        if (links.length > 0) {
          setTimeout(() => {
            links.forEach(link => this.openWhatsAppLink(link));
          }, 500);
        }
      }

      this.closeShareDialog();
    } catch (error) {
      console.error('Error sharing report:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في المشاركة',
        detail: 'فشل في إرسال التقرير'
      });
    } finally {
      this.shareBusy = false;
    }
  }

  // ====================================
  // Helper Functions
  // ====================================
  
  resetForm(): void {
    this.selectedStore = null;
    this.selectedProduct = null;
    this.quantity = 1;
    this.damageDate = new Date();
    this.reason = '';
    this.reportedBy = '';
    this.searchText = '';
    this.products = this.allProducts;
  }

  refreshData(): void {
    this.loadDamagedItems();
  }

  private getFilters(): any {
    return {};
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}`;
  }

  private openWhatsAppLink(url: string) {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch {
      window.location.href = url;
    }
  }

  private extractWhatsAppLinks(res: any): string[] {
    if (!res) return [];
    if (res?.response?.whatsAppLink) return [res.response.whatsAppLink];
    if (res?.whatsAppLink) return [res.whatsAppLink];

    const links: string[] = [];
    if (Array.isArray(res)) {
      res.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    const bags = [res?.responses, res?.items, res?.data]?.filter(Array.isArray);
    if (bags?.length) {
      bags.forEach((arr: any[]) => {
        arr.forEach((item) => {
          const link = item?.response?.whatsAppLink || item?.whatsAppLink;
          if (link) links.push(link);
        });
      });
    }

    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.values(res).forEach((val: any) => {
        const link = val?.response?.whatsAppLink || val?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    return Array.from(new Set(links.filter(Boolean)));
  }
}
