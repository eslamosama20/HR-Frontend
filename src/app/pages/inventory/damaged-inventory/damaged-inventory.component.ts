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
import { DamagedInventoryModel } from 'src/app/models/inventory/damagedInventory.model';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { MainSalesClassModel } from 'src/app/models/sales-classes-tree/mainSalesClass.model';
import { MainPurchaseClassModel } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { DamagedInventoryService } from 'src/app/services/inventory/damaged-inventory.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { InventoryPermitService } from 'src/app/services/permits/inventory-permit.service';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
// منتج من المخزون مع تاريخ الصلاحية
interface StoreProduct {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitName: string;
  batchNo?: string | null;
  expiryDate: Date | string | null;
  shelfNumber: string;
  rowNumber: string;
  permitEntryId: string;
  product: MainPurchaseClassModel | MainSalesClassModel | null;
  _isPurchaseClass: boolean;
}

@Component({
  selector: 'app-damaged-inventory',
  templateUrl: './damaged-inventory.component.html',
  styleUrl: './damaged-inventory.component.scss',
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
    TranslateModule
  ],
  providers: [MessageService]
})
export class DamagedInventoryComponent implements OnInit {
  loadingSignal = signal(false);
  damagedItems = signal<DamagedInventoryModel[]>([]);
  stores: StoreDetailsModel[] = [];
  products: MainSalesClassModel[] = [];
  storeProducts: StoreProduct[] = []; // منتجات المخزن المختار مع تواريخ الصلاحية
  
  // Dialog
  showProductDialog = false;
  selectedStoreProduct: StoreProduct | null = null;
  productQuantity: number = 1;
  
  // Form fields
  selectedStore: StoreDetailsModel | null = null;
  selectedProduct: MainSalesClassModel | null = null;
  quantity: number = 0;
  damageDate: Date = new Date();
  reason: string = '';
  reportedBy: string = 'Smart pro';
  
  // العناصر المختارة للإضافة
  itemsToAdd: {
    product: StoreProduct;
    quantity: number;
  }[] = [];

  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  constructor(
    private damagedInventoryService: DamagedInventoryService,
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

    // Load damaged items
    this.loadDamagedItems();
  }

  loadDamagedItems(): void {
    this.damagedInventoryService.getAll().subscribe({
      next: (items) => {
        this.damagedItems.set(items);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading damaged items', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل بيانات التوالف'
        });
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadDamagedItems();
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
                expiryDate: entry.expiryDate,
                shelfNumber: entry.shelfNumber,
                rowNumber: entry.rowNumber
              });
              const current = exitQuantities.get(key) || 0;
              exitQuantities.set(key, current + (entry.quantity || 0));
            }
          });
        });
        
        // بناء قائمة المنتجات المتاحة
        const productMap = new Map<string, StoreProduct>();
        
        storeEntryPermits.forEach(permit => {
          permit.permitEntries?.forEach(entry => {
            const productId = entry.mainPurchaseClassId || entry.mainSalesClassId;
            if (!productId) return;
            
            const key = buildInventoryTrackingKey({
              productId,
              batchNo: normalizeBatchNo(entry.batchNo),
              expiryDate: entry.expiryDate,
              shelfNumber: entry.shelfNumber,
              rowNumber: entry.rowNumber
            });
            
            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.quantity += entry.quantity || 0;
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
                expiryDate: entry.expiryDate || null,
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

  addDamagedItem(): void {
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

    if (!this.damageDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار تاريخ التلف'
      });
      return;
    }

    this.loading = true;

    // إنشاء تالف لكل منتج في القائمة
    const createObservables = this.itemsToAdd.map(item => {
      const newDamaged = new DamagedInventoryModel();
      newDamaged.storeDetailsId = this.selectedStore!.id;
      newDamaged.storeName = this.selectedStore!.arabicName;
      newDamaged.productId = item.product.productId;
      newDamaged.productName = item.product.productName;
      newDamaged.productCode = item.product.productCode;
      newDamaged.quantity = item.quantity;
      newDamaged.damageDate = this.damageDate;
      newDamaged.reason = this.reason;
      newDamaged.reportedBy = this.reportedBy;
      newDamaged.unitName = item.product.unitName;
      newDamaged.batchNo = item.product.batchNo;

      return this.damagedInventoryService.create(newDamaged);
    });

    // تنفيذ جميع الإنشاءات
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(createObservables).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجاح',
            detail: `تم إضافة ${this.itemsToAdd.length} عنصر تالف بنجاح`
          });
          this.resetForm();
          this.loadDamagedItems();
        },
        error: (err) => {
          console.error('Error adding damaged items', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل إضافة التوالف'
          });
          this.loading = false;
        }
      });
    });
  }

  validateForm(): boolean {
    if (!this.selectedStore) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار المخزن'
      });
      return false;
    }

    if (this.itemsToAdd.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إضافة منتج واحد على الأقل'
      });
      return false;
    }

    if (!this.damageDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار تاريخ التلف'
      });
      return false;
    }

    return true;
  }

  resetForm(): void {
    this.selectedStore = null;
    this.selectedProduct = null;
    this.quantity = 0;
    this.damageDate = new Date();
    this.reason = '';
    this.reportedBy = 'Smart pro';
    this.itemsToAdd = [];
    this.storeProducts = [];
  }

  onProductChange(event: any): void {
    // يمكن إضافة منطق إضافي هنا مثل عرض الكمية المتاحة
  }
}
