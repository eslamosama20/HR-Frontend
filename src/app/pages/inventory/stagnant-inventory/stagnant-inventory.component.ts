import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { StagnantInventoryModel, StagnantReason } from 'src/app/models/inventory/stagnantInventory.model';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { MainSalesClassModel } from 'src/app/models/sales-classes-tree/mainSalesClass.model';
import { MainPurchaseClassModel } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { StagnantInventoryService } from 'src/app/services/inventory/stagnant-inventory.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { InventoryPermitService } from 'src/app/services/permits/inventory-permit.service';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
// منتج من المخزون مع تاريخ آخر حركة
interface StoreProduct {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitName: string;
  batchNo?: string | null;
  lastMovementDate: Date | string | null;
  shelfNumber: string;
  rowNumber: string;
  permitEntryId: string;
  product: MainPurchaseClassModel | MainSalesClassModel | null;
  _isPurchaseClass: boolean;
}

@Component({
  selector: 'app-stagnant-inventory',
  templateUrl: './stagnant-inventory.component.html',
  styleUrl: './stagnant-inventory.component.scss',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    CalendarModule,
    PanelModule,
    TableModule,
    ToastModule,
    InputNumberModule,
    DialogModule,
    RadioButtonModule,
    TooltipModule,
    TranslateModule
  ],
  providers: [MessageService]
})
export class StagnantInventoryComponent implements OnInit {
  loadingSignal = signal(false);
  stagnantItems = signal<StagnantInventoryModel[]>([]);
  stores: StoreDetailsModel[] = [];
  products: MainSalesClassModel[] = [];
  storeProducts: StoreProduct[] = [];
  
  // Dialog
  showProductDialog = false;
  selectedStoreProduct: StoreProduct | null = null;
  productQuantity: number = 1;
  
  // Dispose Dialog
  showDisposeDialog = false;
  selectedItemToDispose: StagnantInventoryModel | null = null;
  selectedDisposalMethod: string = '';
  disposeNotes: string = '';
  disposeLoading = false;
  
  // Share Dialog
  showShareDialog = false;
  shareMethod: 'email' | 'whatsapp' = 'email';
  shareEmail: string = '';
  sharePhone: string = '';
  shareLoading = false;
  
  // Export Loading
  pdfLoading = false;
  excelLoading = false;
  
  // Form fields
  selectedStore: StoreDetailsModel | null = null;
  selectedProduct: MainSalesClassModel | null = null;
  quantity: number = 0;
  selectedReason: StagnantReason = StagnantReason.Manual;
  stagnantPeriodMonths: number = 0;
  notes: string = '';
  addedBy: string = 'Smart pro';
  
  // العناصر المختارة للإضافة
  itemsToAdd: {
    product: StoreProduct;
    quantity: number;
  }[] = [];

  // Reason options dropdown
  reasonOptions = [
    { label: 'يدوي', value: StagnantReason.Manual },
    { label: 'تلقائي بالفترة', value: StagnantReason.AutoByPeriod },
    { label: 'عند إذن الدخول', value: StagnantReason.OnEntryPermit }
  ];

  // Disposal method options
  disposalMethodOptions = [
    { label: 'بيع بخصم', value: 'discount_sale' },
    { label: 'تبرع', value: 'donation' },
    { label: 'إعادة تدوير', value: 'recycling' },
    { label: 'إتلاف', value: 'destruction' },
    { label: 'نقل لمخزن آخر', value: 'transfer' },
    { label: 'أخرى', value: 'other' }
  ];

  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  constructor(
    private stagnantInventoryService: StagnantInventoryService,
    private storeDetailsService: StoreDetailsService,
    private mainSalesClassService: MainSalesClassService,
    private mainPurchaseClassService: MainPurchaseClassService,
    private inventoryPermitService: InventoryPermitService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    
    // Load stores
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        this.stores = stores.map(store => new StoreDetailsModel(store));
      },
      error: (err) => {
        console.error('Error loading stores', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل المخازن'
        });
      }
    });

    // Load products
    this.mainSalesClassService.getAll().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل الأصناف'
        });
      }
    });

    // Load stagnant items
    this.loadStagnantItems();
  }

  loadStagnantItems(): void {
    this.stagnantInventoryService.getAll().subscribe({
      next: (items) => {
        this.stagnantItems.set(items);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading stagnant items', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل بيانات الرواكد'
        });
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadStagnantItems();
  }

  // فتح dialog اختيار المنتج من المخزن
  openProductDialog(): void {
    if (!this.selectedStore) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء اختيار المخزن أولاً'
      });
      return;
    }
    this.showProductDialog = true;
  }

  // عند تغيير المخزن المختار
  onStoreChange(event: any): void {
    if (this.selectedStore) {
      this.loadStoreProducts(this.selectedStore.id);
      this.itemsToAdd = [];
    } else {
      this.storeProducts = [];
      this.itemsToAdd = [];
    }
  }

  // تحميل منتجات المخزن من صلاحيات المخزون
  loadStoreProducts(storeId: string): void {
    this.loading = true;
    this.storeProducts = [];
    
    this.inventoryPermitService.getAll().subscribe({
      next: (permits) => {
        // فلترة أذونات الدخول للمخزن المحدد فقط
        const storeEntryPermits = permits.filter(
          p => p.storeDetailsId === storeId && p.permitType === 'Entry'
        );
        
        // فلترة أذونات الخروج للمخزن المحدد
        const storeExitPermits = permits.filter(
          p => p.storeDetailsId === storeId && p.permitType === 'Exit'
        );
        
        // بناء خريطة للكميات المخرجة
        const exitQuantities = new Map<string, number>();
        storeExitPermits.forEach(permit => {
          permit.permitEntries?.forEach(entry => {
            const productId = entry.mainPurchaseClassId || entry.mainSalesClassId;
            if (productId) {
              const key = buildInventoryTrackingKey({
                productId,
                batchNo: normalizeBatchNo(entry.batchNo),
                shelfNumber: entry.shelfNumber,
                rowNumber: entry.rowNumber
              });
              const current = exitQuantities.get(key) || 0;
              exitQuantities.set(key, current + (entry.quantity || 0));
            }
          });
        });
        
        // بناء قائمة المنتجات المتاحة مع آخر حركة
        const productMap = new Map<string, StoreProduct>();
        
        storeEntryPermits.forEach(permit => {
          permit.permitEntries?.forEach(entry => {
            const productId = entry.mainPurchaseClassId || entry.mainSalesClassId;
            if (!productId) return;
            
            const key = buildInventoryTrackingKey({
              productId,
              batchNo: normalizeBatchNo(entry.batchNo),
              shelfNumber: entry.shelfNumber,
              rowNumber: entry.rowNumber
            });
            
            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.quantity += entry.quantity || 0;
              // تحديث آخر حركة إذا كانت أحدث
              if (permit.createdAt && (!existing.lastMovementDate || new Date(permit.createdAt) > new Date(existing.lastMovementDate))) {
                existing.lastMovementDate = permit.createdAt;
              }
            } else {
              const isPurchaseClass = !!entry.mainPurchaseClassId;
              const product = isPurchaseClass ? entry.mainPurchaseClass : entry.mainSalesClass;
              
              productMap.set(key, {
                productId: productId,
                productName: product?.arabicName || 'غير محدد',
                productCode: product?.referenceCode || '-',
                quantity: entry.quantity || 0,
                unitName: product?.measurementUnit?.arabicName || '-',
                batchNo: normalizeBatchNo(entry.batchNo),
                lastMovementDate: permit.createdAt || null,
                shelfNumber: entry.shelfNumber || '',
                rowNumber: entry.rowNumber || '',
                permitEntryId: entry.id!,
                product: product || null,
                _isPurchaseClass: isPurchaseClass
              });
            }
          });
        });
        
        // طرح الكميات المخرجة
        productMap.forEach((product, key) => {
          const exitQty = exitQuantities.get(key) || 0;
          product.quantity -= exitQty;
        });
        
        // فلترة المنتجات ذات الكمية الموجبة
        this.storeProducts = Array.from(productMap.values())
          .filter(p => p.quantity > 0)
          .sort((a, b) => a.productName.localeCompare(b.productName));
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading store products', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل منتجات المخزن'
        });
        this.loading = false;
      }
    });
  }

  // إضافة منتج للقائمة من الـ dialog
  addProductFromDialog(): void {
    if (!this.selectedStoreProduct || !this.productQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء اختيار المنتج والكمية'
      });
      return;
    }

    if (this.productQuantity > this.selectedStoreProduct.quantity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: `الكمية المتاحة هي ${this.selectedStoreProduct.quantity} فقط`
      });
      return;
    }

    // التحقق من عدم إضافة نفس المنتج مرتين
    const existingItem = this.itemsToAdd.find(
      item => item.product.permitEntryId === this.selectedStoreProduct!.permitEntryId
    );
    
    if (existingItem) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'هذا المنتج مضاف بالفعل'
      });
      return;
    }

    this.itemsToAdd.push({
      product: this.selectedStoreProduct,
      quantity: this.productQuantity
    });

    // تحديث الكمية المتاحة
    const index = this.storeProducts.findIndex(
      sp => sp.permitEntryId === this.selectedStoreProduct!.permitEntryId
    );
    if (index > -1) {
      this.storeProducts[index].quantity -= this.productQuantity;
      if (this.storeProducts[index].quantity <= 0) {
        this.storeProducts.splice(index, 1);
      }
    }

    this.showProductDialog = false;
    this.selectedStoreProduct = null;
    this.productQuantity = 1;
  }

  // إزالة منتج من القائمة
  removeItemToAdd(index: number): void {
    const removedItem = this.itemsToAdd[index];
    
    // إعادة الكمية للمنتج
    const existingProduct = this.storeProducts.find(
      sp => sp.permitEntryId === removedItem.product.permitEntryId
    );
    
    if (existingProduct) {
      existingProduct.quantity += removedItem.quantity;
    } else {
      this.storeProducts.push({
        ...removedItem.product,
        quantity: removedItem.quantity
      });
    }
    
    this.itemsToAdd.splice(index, 1);
  }

  addStagnantItem(): void {
    if (!this.selectedStore) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار المخزن'
      });
      return;
    }

    if (this.itemsToAdd.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إضافة منتج واحد على الأقل'
      });
      return;
    }

    this.loading = true;

    // إنشاء راكد لكل منتج في القائمة
    const createObservables = this.itemsToAdd.map(item => {
      const newStagnant = new StagnantInventoryModel();
      newStagnant.storeDetailsId = this.selectedStore!.id;
      newStagnant.storeName = this.selectedStore!.arabicName;
      
      if (item.product._isPurchaseClass) {
        newStagnant.mainPurchaseClassId = item.product.productId;
        newStagnant.mainPurchaseClassName = item.product.productName;
      } else {
        newStagnant.mainSalesClassId = item.product.productId;
        newStagnant.mainSalesClassName = item.product.productName;
      }
      
      newStagnant.productCode = item.product.productCode;
      newStagnant.quantity = item.quantity;
      newStagnant.lastMovementDate = item.product.lastMovementDate || new Date();
      newStagnant.addedToStagnantDate = new Date();
      newStagnant.reason = this.selectedReason;
      newStagnant.stagnantPeriodMonths = this.stagnantPeriodMonths;
      newStagnant.notes = this.notes;
      newStagnant.addedBy = this.addedBy;
      newStagnant.isAutoAdded = this.selectedReason !== StagnantReason.Manual;
      newStagnant.batchNo = item.product.batchNo;

      return this.stagnantInventoryService.create(newStagnant);
    });

    // تنفيذ جميع الإنشاءات
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(createObservables).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجاح',
            detail: `تم إضافة ${this.itemsToAdd.length} عنصر راكد بنجاح`
          });
          this.resetForm();
          this.loadStagnantItems();
        },
        error: (err) => {
          console.error('Error adding stagnant items', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل إضافة الرواكد'
          });
          this.loading = false;
        }
      });
    });
  }

  resetForm(): void {
    this.selectedStore = null;
    this.selectedProduct = null;
    this.quantity = 0;
    this.selectedReason = StagnantReason.Manual;
    this.stagnantPeriodMonths = 0;
    this.notes = '';
    this.addedBy = 'Smart pro';
    this.itemsToAdd = [];
    this.storeProducts = [];
  }

  // Helper methods
  getReasonDisplay(reason: StagnantReason): string {
    switch (reason) {
      case StagnantReason.Manual:
        return 'يدوي';
      case StagnantReason.AutoByPeriod:
        return 'تلقائي بالفترة';
      case StagnantReason.OnEntryPermit:
        return 'عند إذن الدخول';
      default:
        return 'غير محدد';
    }
  }

  getStagnantDays(item: StagnantInventoryModel): number {
    if (!item.lastMovementDate) return 0;
    const lastMove = new Date(item.lastMovementDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastMove.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStagnantDaysClass(item: StagnantInventoryModel): string {
    const days = this.getStagnantDays(item);
    if (days > 180) return 'danger';
    if (days > 90) return 'warning';
    return '';
  }

  getRowClass = (item: StagnantInventoryModel) => {
    return item.isDisposed ? 'disposed-row' : '';
  }

  // Dispose Dialog
  openDisposeDialog(item: StagnantInventoryModel): void {
    this.selectedItemToDispose = item;
    this.selectedDisposalMethod = '';
    this.disposeNotes = '';
    this.showDisposeDialog = true;
  }

  confirmDispose(): void {
    if (!this.selectedItemToDispose || !this.selectedDisposalMethod) {
      return;
    }

    this.disposeLoading = true;

    // Update the item with disposal info
    const updatedItem = new StagnantInventoryModel(this.selectedItemToDispose);
    updatedItem.isDisposed = true;
    updatedItem.disposedDate = new Date();
    updatedItem.disposalMethod = this.selectedDisposalMethod;
    if (this.disposeNotes) {
      updatedItem.notes = (updatedItem.notes ? updatedItem.notes + '\n' : '') + 'ملاحظات التصرف: ' + this.disposeNotes;
    }

    this.stagnantInventoryService.update(updatedItem).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تسجيل التصرف بنجاح'
        });
        this.showDisposeDialog = false;
        this.selectedItemToDispose = null;
        this.disposeLoading = false;
        this.loadStagnantItems();
      },
      error: (err) => {
        console.error('Error disposing item', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تسجيل التصرف'
        });
        this.disposeLoading = false;
      }
    });
  }

  // PDF Report
  downloadPdfReport(): void {
    this.pdfLoading = true;
    this.stagnantInventoryService.getPdfReport().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stagnant-inventory-report-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.pdfLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تحميل التقرير بنجاح'
        });
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل التقرير'
        });
        this.pdfLoading = false;
      }
    });
  }

  // Excel Export
  exportExcel(): void {
    this.excelLoading = true;
    this.stagnantInventoryService.exportToExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stagnant-inventory-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.excelLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تصدير البيانات بنجاح'
        });
      },
      error: (err) => {
        console.error('Error exporting Excel', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تصدير البيانات'
        });
        this.excelLoading = false;
      }
    });
  }

  // Print PDF
  printPDF(): void {
    this.pdfLoading = true;
    this.stagnantInventoryService.getPdfReport().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        this.pdfLoading = false;
      },
      error: (err) => {
        console.error('Error printing PDF', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل طباعة التقرير'
        });
        this.pdfLoading = false;
      }
    });
  }

  // Share Dialog
  openShareDialog(): void {
    this.shareMethod = 'email';
    this.shareEmail = '';
    this.sharePhone = '';
    this.showShareDialog = true;
  }

  confirmShare(): void {
    this.shareLoading = true;

    if (this.shareMethod === 'email' && this.shareEmail) {
      this.stagnantInventoryService.shareViaEmail(this.shareEmail).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجاح',
            detail: 'تم إرسال التقرير بنجاح'
          });
          this.showShareDialog = false;
          this.shareLoading = false;
        },
        error: (err) => {
          console.error('Error sharing via email', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل إرسال التقرير'
          });
          this.shareLoading = false;
        }
      });
    } else if (this.shareMethod === 'whatsapp' && this.sharePhone) {
      this.stagnantInventoryService.shareViaWhatsApp(this.sharePhone).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجاح',
            detail: 'تم إرسال التقرير بنجاح'
          });
          this.showShareDialog = false;
          this.shareLoading = false;
        },
        error: (err) => {
          console.error('Error sharing via WhatsApp', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل إرسال التقرير'
          });
          this.shareLoading = false;
        }
      });
    }
  }
}
