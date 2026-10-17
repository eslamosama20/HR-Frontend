import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { QRCodeModule } from 'angularx-qrcode';
import {
  normalizeStoreCategory,
  StoreCategory,
  StoreDetailsModel
} from 'src/app/models/inventory/storeDetails.model';
import { InventoryPermitModel } from 'src/app/models/permits/inventory-permit.model';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { InventoryPermitService } from 'src/app/services/permits/inventory-permit.service';
import { HttpClient } from '@angular/common/http';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { environment } from 'src/environments/environment';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
interface InventoryItem {
  productName: string;
  productCode: string;
  quantity: number;
  unitName: string;
  permitType: 'Entry' | 'Exit';
  shelfNumber?: string;
  rowNumber?: string;
  batchNo?: string | null;
  expiryDate?: Date | string;
  unitPrice?: number;
  productId?: string;
  isPurchaseClass?: boolean;
  isTrackedMedication?: boolean;
}

interface ScannedItem {
  productCode: string;
  productName: string;
  storeName: string;
  quantity: number;
  unitName: string;
  batchNo?: string | null;
  shelfNumber?: string;
  rowNumber?: string;
  expiryDate?: string;
  unitPrice?: number;
}

@Component({
  selector: 'app-inventory-view',
  templateUrl: './inventory-view.component.html',
  styleUrl: './inventory-view.component.scss',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    PanelModule,
    TableModule,
    ToastModule,
    TranslateModule,
    CalendarModule,
    DialogModule,
    TabViewModule,
    InputTextModule,
    InputNumberModule,
    InputTextareaModule,
    TooltipModule,
    QRCodeModule
  ],
  providers: [MessageService]
})
export class InventoryViewComponent implements OnInit {
  @ViewChild('barcodeContainer') barcodeContainer!: ElementRef;
  
  loadingSignal = signal(false);
  stores: StoreDetailsModel[] = [];
  allStores: StoreDetailsModel[] = [];
  selectedStore: StoreDetailsModel | null = null;
  selectedStoreCategoryFilter: StoreCategory | 'all' = 'all';
  inventoryItems: any[] = [];
  dateRange: Date[] = [];
  startDate: Date | null = null;
  endDate: Date | null = null;
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;
  
  // Barcode dialog properties
  barcodeDialogVisible = false;
  selectedItem: InventoryItem | null = null;
  
  // Scanner dialog properties
  scannerDialogVisible = false;
  scannedBarcodeData = '';
  scannedItem: ScannedItem | null = null;
  
  // Stagnant dialog properties
  stagnantDialogVisible = false;
  stagnantItem: InventoryItem | null = null;
  stagnantQuantity: number = 0;
  stagnantNotes: string = '';
  stagnantBusy = false;
  
  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  constructor(
    private storeDetailsService: StoreDetailsService,
    private inventoryPermitService: InventoryPermitService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private http: HttpClient,
    private pdfUtils: PdfUtilsService
  ) {}

  private readonly inventoryUrl = environment.server_urls[environment.active_server].inventoryUrl;
  private readonly baseApi = environment.server_urls[environment.active_server].baseApi;

  ngOnInit(): void {
    this.loadStores();
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }

  loadStores(): void {
    this.loading = true;
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        this.allStores = Array.isArray(stores) ? stores.map(store => new StoreDetailsModel(store)) : [];
        this.applyStoreFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stores:', error);
        this.allStores = [];
        this.stores = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل المخازن'
        });
      }
    });
  }

  applyStoreFilter(): void {
    const filter = this.selectedStoreCategoryFilter;
    this.stores = filter === 'all'
      ? [...this.allStores]
      : this.allStores.filter(store => normalizeStoreCategory(store.storeCategory ?? store.storeType) === filter);

    if (this.selectedStore && !this.stores.some(store => store.id === this.selectedStore?.id)) {
      this.selectedStore = null;
      this.inventoryItems = [];
    }
  }

  get storeCategoryOptions(): Array<{ label: string; value: StoreCategory | 'all' }> {
    return [
      { label: 'كل الأنواع', value: 'all' },
      { label: 'عام', value: StoreCategory.General },
      { label: 'صيدلية', value: StoreCategory.Pharmacy },
      { label: 'مستودع', value: StoreCategory.Warehouse },
      { label: 'نقطة بيع', value: StoreCategory.Retail }
    ];
  }

  getStoreCategoryLabel(store?: StoreDetailsModel | null): string {
    switch (normalizeStoreCategory(store?.storeCategory ?? store?.storeType)) {
      case StoreCategory.Pharmacy:
        return 'صيدلية';
      case StoreCategory.Warehouse:
        return 'مستودع';
      case StoreCategory.Retail:
        return 'نقطة بيع';
      case StoreCategory.General:
      default:
        return 'عام';
    }
  }

  onStoreChange(): void {
    if (!this.selectedStore) {
      this.inventoryItems = [];
      return;
    }

    this.loading = true;
    this.inventoryItems = []; // Clear previous items
    
    // Get permits filtered by store from backend
    this.inventoryPermitService.getByStoreId(this.selectedStore.id!).subscribe({
      next: (permits) => {
        console.log('Store permits:', permits);
        
        if (!permits || !Array.isArray(permits)) {
          console.error('Permits is not an array:', permits);
          this.inventoryItems = [];
          this.loading = false;
          return;
        }

        // جمع أذونات الدخول أولاً مع مفتاح فريد (productId + expiryDate + shelfNumber)
        const entryItemsMap = new Map<string, any>();
        
        // جمع أذونات الخروج لطرحها لاحقاً
        const exitItems: any[] = [];
        
        permits.forEach(permit => {
          if (permit.permitEntries && permit.permitEntries.length > 0) {
            permit.permitEntries.forEach((entry: any) => {
              const product = entry.mainPurchaseClass || entry.mainSalesClass;
              if (product) {
                const batchNo = normalizeBatchNo(entry.batchNo);
                const uniqueKey = buildInventoryTrackingKey({
                  productId: product.id,
                  batchNo,
                  expiryDate: entry.expiryDate,
                  shelfNumber: entry.shelfNumber,
                  rowNumber: entry.rowNumber
                });
                
                if (permit.permitType === 'Entry') {
                  const existingItem = entryItemsMap.get(uniqueKey);
                  if (existingItem) {
                    existingItem.quantity += (entry.quantity || 0);
                  } else {
                    entryItemsMap.set(uniqueKey, {
                      productId: product.id,
                      productName: product.arabicName || 'غير محدد',
                      productCode: product.referenceCode || '-',
                      quantity: entry.quantity || 0,
                      unitName: product.measurementUnit?.arabicName || '-',
                      unitPrice: entry.unitPrice || 0,
                      shelfNumber: entry.shelfNumber || '',
                      rowNumber: entry.rowNumber || '',
                      batchNo,
                      expiryDate: entry.expiryDate || null,
                      permitType: permit.permitType,
                      permitDate: permit.permitDate || null,
                      referenceNumber: permit.referenceNumber || '-',
                      uniqueKey: uniqueKey,
                      isPurchaseClass: !!entry.mainPurchaseClass,
                      isTrackedMedication: !!entry.mainPurchaseClass && (
                        product.itemType === 'medication' ||
                        product.isPharmacyItem === true ||
                        product.needsBatch === true ||
                        product.needsExpiry === true
                      )
                    });
                  }
                } else if (permit.permitType === 'Exit') {
                  exitItems.push({
                    productId: product.id,
                    quantity: entry.quantity || 0,
                    batchNo,
                    expiryDate: entry.expiryDate || null,
                    shelfNumber: entry.shelfNumber || '',
                    rowNumber: entry.rowNumber || '',
                    uniqueKey: uniqueKey
                  });
                }
              }
            });
          }
        });

        // طرح أذونات الخروج من أذونات الدخول
        console.log('=== DEBUG: Exit Items ===');
        exitItems.forEach(exitItem => {
          console.log('Exit Item:', {
            productId: exitItem.productId,
            expiryDate: exitItem.expiryDate,
            shelfNumber: exitItem.shelfNumber,
            rowNumber: exitItem.rowNumber,
            quantity: exitItem.quantity,
            uniqueKey: exitItem.uniqueKey
          });
        });
        
        console.log('=== DEBUG: Entry Items Map ===');
        entryItemsMap.forEach((item, key) => {
          console.log('Entry Key:', key, 'Item:', {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            expiryDate: item.expiryDate
          });
        });
        
        exitItems.forEach(exitItem => {
          // أولاً نحاول الطرح من نفس المفتاح (نفس المنتج + تاريخ الصلاحية + الرف)
          let entryItem = entryItemsMap.get(exitItem.uniqueKey);
          
          console.log('Looking for key:', exitItem.uniqueKey, 'Found:', !!entryItem);
          
          if (entryItem) {
            console.log(`Deducting ${exitItem.quantity} from matched entry (before: ${entryItem.quantity})`);
            entryItem.quantity -= exitItem.quantity;
            console.log(`After deduction: ${entryItem.quantity}`);
          } else {
            console.log('No exact match found, falling back to productId match...');
            // إذا لم نجد تطابق تام، نبحث عن أي إذن دخول لنفس المنتج
            for (const [key, item] of entryItemsMap.entries()) {
              if (item.productId === exitItem.productId && item.quantity > 0) {
                const deductAmount = Math.min(item.quantity, exitItem.quantity);
                console.log(`Fallback deducting ${deductAmount} from ${key} (before: ${item.quantity})`);
                item.quantity -= deductAmount;
                exitItem.quantity -= deductAmount;
                console.log(`After fallback: ${item.quantity}`);
                if (exitItem.quantity <= 0) break;
              }
            }
          }
        });

        // تحويل الخريطة إلى مصفوفة وإزالة العناصر ذات الكمية صفر أو أقل
        const resultArray = Array.from(entryItemsMap.values()).filter(item => item.quantity > 0);
        
        console.log('Inventory items after deducting exits:', resultArray);
        
        this.inventoryItems = [...resultArray];

        this.loading = false;
        
        if (this.inventoryItems.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'معلومة',
            detail: 'لا توجد أصناف في هذا المخزن'
          });
        }
      },
      error: (error) => {
        console.error('Error loading inventory:', error);
        this.loading = false;
        this.inventoryItems = [];
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل الأصناف'
        });
      }
    });
  }

  // Barcode and scanner methods
  showBarcode(item: InventoryItem): void {
    this.selectedItem = item;
    this.barcodeDialogVisible = true;
  }

  printBarcode(item: InventoryItem): void {
    this.selectedItem = item;
    this.printBarcodeDialog();
  }

  closeBarcodeDialog(): void {
    this.barcodeDialogVisible = false;
    this.selectedItem = null;
  }

  generateBarcodeData(item: InventoryItem): string {
    const data = {
      code: item.productCode,
      name: item.productName,
      store: this.selectedStore?.arabicName || '',
      storeId: this.selectedStore?.id || '',
      storeType: this.getStoreCategoryLabel(this.selectedStore),
      qty: item.quantity,
      unit: item.unitName,
      batchNo: item.batchNo || '',
      shelf: item.shelfNumber || '',
      row: item.rowNumber || '',
      expiry: item.expiryDate ? this.formatDateForBarcode(item.expiryDate) : '',
      price: item.unitPrice || 0
    };
    return JSON.stringify(data);
  }

  formatDateForBarcode(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  printBarcodeDialog(): void {
    if (!this.selectedItem) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>طباعة باركود</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; padding: 20px; }
          .barcode-container { margin: 20px auto; padding: 20px; border: 1px solid #ccc; max-width: 300px; }
          .product-info { margin-top: 15px; text-align: right; font-size: 12px; }
          .product-info div { margin: 5px 0; }
          .label { font-weight: bold; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <img src="${this.getQRCodeImageUrl()}" alt="QR Code" style="width: 150px; height: 150px;">
          <div class="product-info">
            <div><span class="label">كود:</span> ${this.selectedItem.productCode}</div>
            <div><span class="label">اسم:</span> ${this.selectedItem.productName}</div>
            <div><span class="label">المخزن:</span> ${this.selectedStore?.arabicName || '-'}</div>
            <div><span class="label">الكمية:</span> ${this.selectedItem.quantity}</div>
            <div><span class="label">الرف:</span> ${this.selectedItem.shelfNumber || '-'}</div>
            <div><span class="label">العمود:</span> ${this.selectedItem.rowNumber || '-'}</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  }

  getQRCodeImageUrl(): string {
    // Generate QR code URL using a service or canvas
    if (!this.selectedItem) return '';
    const data = encodeURIComponent(this.generateBarcodeData(this.selectedItem));
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data}`;
  }

  openScannerDialog(): void {
    this.scannerDialogVisible = true;
    this.scannedBarcodeData = '';
    this.scannedItem = null;
  }

  closeScannerDialog(): void {
    this.scannerDialogVisible = false;
    this.scannedBarcodeData = '';
    this.scannedItem = null;
  }

  processBarcodeData(): void {
    if (!this.scannedBarcodeData.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء إدخال بيانات الباركود'
      });
      return;
    }

    const barcodeInput = this.scannedBarcodeData.trim().replace(/\|/g, ''); // Remove pipe characters

    // First try to parse as JSON (for QR codes generated by our system)
    try {
      const data = JSON.parse(barcodeInput);
      this.scannedItem = {
        productCode: data.code || '-',
        productName: data.name || '-',
        storeName: data.store || '-',
        quantity: data.qty || 0,
        unitName: data.unit || '-',
        batchNo: data.batchNo || '-',
        shelfNumber: data.shelf || '-',
        rowNumber: data.row || '-',
        expiryDate: data.expiry || '-',
        unitPrice: data.price || 0
      };
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح',
        detail: 'تم قراءة الباركود بنجاح'
      });
      return;
    } catch (e) {
      // Not JSON, try to find by product code or reference code in loaded inventory
    }

    // Search in loaded inventory items by productCode or referenceCode
    const foundItem = this.inventoryItems.find((item: any) => {
      const itemCode = (item.productCode || '').toString().toLowerCase();
      const searchCode = barcodeInput.toLowerCase();
      return itemCode === searchCode || itemCode.includes(searchCode) || searchCode.includes(itemCode);
    });

    if (foundItem) {
      this.scannedItem = {
        productCode: foundItem.productCode || '-',
        productName: foundItem.productName || '-',
        storeName: this.selectedStore?.arabicName || '-',
        quantity: foundItem.quantity || 0,
        unitName: foundItem.unitName || '-',
        batchNo: foundItem.batchNo || '-',
        shelfNumber: foundItem.shelfNumber || '-',
        rowNumber: foundItem.rowNumber || '-',
        expiryDate: foundItem.expiryDate ? this.formatDateForBarcode(foundItem.expiryDate) : '-',
        unitPrice: foundItem.unitPrice || 0
      };
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح',
        detail: 'تم العثور على الصنف'
      });
    } else {
      // If not found in current store, search via API
      this.searchProductByBarcode(barcodeInput);
    }
  }

  searchProductByBarcode(barcode: string): void {
    this.loading = true;
    
    // Search in all permits for this barcode
    this.inventoryPermitService.getAll().subscribe({
      next: (permits: any[]) => {
        let foundEntry: any = null;
        let foundPermit: any = null;
        
        for (const permit of permits) {
          if (permit.permitEntries) {
            for (const entry of permit.permitEntries) {
              const product = entry.mainPurchaseClass || entry.mainSalesClass;
              if (product) {
                const refCode = (product.referenceCode || '').toString().toLowerCase();
                if (refCode === barcode.toLowerCase() || refCode.includes(barcode.toLowerCase())) {
                  foundEntry = entry;
                  foundPermit = permit;
                  break;
                }
              }
            }
            if (foundEntry) break;
          }
        }

        if (foundEntry) {
          const product = foundEntry.mainPurchaseClass || foundEntry.mainSalesClass;
          this.scannedItem = {
            productCode: product?.referenceCode || '-',
            productName: product?.arabicName || '-',
            storeName: foundPermit?.storeDetails?.arabicName || '-',
            quantity: foundEntry.quantity || 0,
            unitName: product?.measurementUnit?.arabicName || '-',
            batchNo: foundEntry.batchNo || '-',
            shelfNumber: foundEntry.shelfNumber || '-',
            rowNumber: foundEntry.rowNumber || '-',
            expiryDate: foundEntry.expiryDate ? this.formatDateForBarcode(foundEntry.expiryDate) : '-',
            unitPrice: foundEntry.unitPrice || 0
          };
          
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم العثور على الصنف'
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تحذير',
            detail: 'لم يتم العثور على صنف بهذا الباركود'
          });
          this.scannedItem = null;
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching for product:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء البحث عن الصنف'
        });
        this.scannedItem = null;
        this.loading = false;
      }
    });
  }

  // Expiry date helper methods
  isExpired(date: Date | string): boolean {
    if (!date) return false;
    const expiryDate = new Date(date);
    return expiryDate < new Date();
  }

  isExpiringSoon(date: Date | string): boolean {
    if (!date) return false;
    const expiryDate = new Date(date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
  }

  getTotalQuantity(): number {
    return this.inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getTotalValue(): number {
    return 0; // We don't have price info from batches
  }

  exportToExcel(): void {
    if (!this.inventoryItems || this.inventoryItems.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      const data = this.inventoryItems.map((item, index) => ({
        'م': index + 1,
        'كود الصنف': item.productCode || '-',
        'اسم الصنف': item.productName || '-',
        'الوحدة': item.unitName || '-',
        'الكمية': item.quantity || 0
      }));

      // Add summary rows
      const totalItems = this.inventoryItems.length;
      const totalQuantity = this.inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      data.push({} as any); // Empty row
      data.push({
        'م': '',
        'كود الصنف': 'الإجماليات',
        'اسم الصنف': '',
        'الوحدة': '',
        'الكمية': ''
      } as any);
      data.push({
        'م': '',
        'كود الصنف': 'إجمالي الأصناف',
        'اسم الصنف': totalItems.toString(),
        'الوحدة': '',
        'الكمية': ''
      } as any);
      data.push({
        'م': '',
        'كود الصنف': 'إجمالي الكمية',
        'اسم الصنف': totalQuantity.toLocaleString('ar-SA'),
        'الوحدة': '',
        'الكمية': ''
      } as any);

      this.pdfUtils.exportToExcel(data, `تقرير_المخزون_${this.selectedStore?.arabicName || 'عام'}_${this.formatDateForFileName(new Date())}`);
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح التصدير',
        detail: 'تم تصدير الملف بنجاح'
      });
    } catch (error) {
      console.error('Export error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في التصدير',
        detail: 'فشل في تصدير الملف'
      });
    }
  }

  printPDF(): void {
    if (!this.inventoryItems || this.inventoryItems.length === 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'تحذير', 
        detail: 'لا توجد بيانات للطباعة' 
      });
      return;
    }

    try {
      const storeId = this.selectedStore?.id;
      const url = `${this.baseApi}inventoryPermit/Report/inventory-document${storeId ? '?storeId=' + storeId : ''}`;
      
      this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (response: Blob) => {
          this.pdfUtils.printBlob(response);
        },
        error: (error) => {
          console.error('Print error:', error);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'خطأ', 
            detail: 'فشل طباعة التقرير' 
          });
        }
      });
    } catch (error) {
      console.error('Print error:', error);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'خطأ', 
        detail: 'فشل طباعة التقرير' 
      });
    }
  }

  downloadPDF(): void {
    if (!this.inventoryItems || this.inventoryItems.length === 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'تحذير', 
        detail: 'لا توجد بيانات للتصدير' 
      });
      return;
    }

    try {
      const storeId = this.selectedStore?.id;
      const storeName = this.selectedStore?.arabicName || 'عام';
      const fileName = `تقرير_المخزون_${storeName}_${this.formatDateForFileName(new Date())}.pdf`;
      const url = `${this.baseApi}inventoryPermit/Report/inventory-document${storeId ? '?storeId=' + storeId : ''}`;
      
      this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (response: Blob) => {
          this.pdfUtils.downloadFile(response, fileName);
          this.messageService.add({ 
            severity: 'success', 
            summary: 'نجح', 
            detail: 'تم تنزيل التقرير بنجاح' 
          });
        },
        error: (error) => {
          console.error('Download error:', error);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'خطأ', 
            detail: 'فشل تنزيل التقرير' 
          });
        }
      });
    } catch (error) {
      console.error('Download error:', error);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'خطأ', 
        detail: 'فشل تنزيل التقرير' 
      });
    }
  }

  openShareDialog(): void {
    if (!this.inventoryItems || this.inventoryItems.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    
    if (!this.selectedStore) {
      this.messageService.add({ severity: 'warn', summary: 'تحذير', detail: 'برجاء اختيار مخزن أولاً' });
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

  submitShareEmail(): void {
    const email = (this.shareForm.get('email')?.value || '').trim();
    if (!email || this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال بريد صحيح'
      });
      return;
    }

    if (!this.inventoryItems || this.inventoryItems.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    try {
      const storeId = this.selectedStore?.id;
      const payload = {
        method: 'email',
        receiver: email,
        storeId: storeId
      };

      this.http.post(`${this.baseApi}inventoryPermit/Report/inventory-share`, payload).subscribe({
        next: (response) => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'نجح', 
            detail: 'تم إرسال التقرير بنجاح' 
          });
          this.closeShareDialog();
        },
        error: (error) => {
          console.error('Share error', error);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'خطأ', 
            detail: 'فشل مشاركة التقرير' 
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        }
      });
    } catch (err) {
      console.error('Share error', err);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'خطأ', 
        detail: 'فشل مشاركة التقرير' 
      });
      this.shareBusy = false;
      this.shareForm.enable({ emitEvent: false });
    }
  }

  submitShareWhatsApp(): void {
    const phone = (this.shareForm.get('whatsappNumber')?.value || '').trim();
    if (!phone || this.shareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال رقم جوال صحيح'
      });
      return;
    }

    if (!this.inventoryItems || this.inventoryItems.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    try {
      const storeId = this.selectedStore?.id;
      const payload = {
        method: 'whatsapp',
        receiver: phone,
        storeId: storeId
      };

      this.http.post(`${this.baseApi}inventoryPermit/Report/inventory-share`, payload).subscribe({
        next: (response) => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'نجح', 
            detail: 'تم إرسال التقرير بنجاح' 
          });
          this.closeShareDialog();
        },
        error: (error) => {
          console.error('Share error', error);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'خطأ', 
            detail: 'فشل مشاركة التقرير' 
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        }
      });
    } catch (err) {
      console.error('Share error', err);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'خطأ', 
        detail: 'فشل مشاركة التقرير' 
      });
      this.shareBusy = false;
      this.shareForm.enable({ emitEvent: false });
    }
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

  /** افتح رابط واتساب بأمان */
  private openWhatsAppLink(url: string) {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch {
      window.location.href = url;
    }
  }

  /** استخرج روابط واتساب من استجابة السيرفر */
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

  // ====================================
  // Stagnant Inventory Methods
  // ====================================
  
  openStagnantDialog(item: InventoryItem): void {
    this.stagnantItem = item;
    this.stagnantQuantity = item.quantity;
    this.stagnantNotes = '';
    this.stagnantDialogVisible = true;
  }

  confirmTransferToStagnant(): void {
    if (!this.stagnantItem || !this.selectedStore) return;
    
    if (this.stagnantQuantity <= 0 || this.stagnantQuantity > this.stagnantItem.quantity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء إدخال كمية صحيحة'
      });
      return;
    }
    
    this.stagnantBusy = true;
    
    const stagnantData = {
      mainPurchaseClassId: this.stagnantItem.isPurchaseClass ? this.stagnantItem.productId : null,
      mainSalesClassId: !this.stagnantItem.isPurchaseClass ? this.stagnantItem.productId : null,
      quantity: this.stagnantQuantity,
      storeDetailsId: this.selectedStore.id,
      reason: 0, // Manual
      notes: this.stagnantNotes,
      lastMovementDate: new Date()
    };
    
    this.http.post(`${this.baseApi}inventory/StagnantInventory/manual`, stagnantData)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم تحويل الصنف للرواكد بنجاح'
          });
          this.stagnantDialogVisible = false;
          this.stagnantBusy = false;
          // Refresh inventory list
          if (this.selectedStore) {
            this.onStoreChange();
          }
        },
        error: (err) => {
          console.error('Error transferring to stagnant:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err.error?.message || 'فشل تحويل الصنف للرواكد'
          });
          this.stagnantBusy = false;
        }
      });
  }
}
