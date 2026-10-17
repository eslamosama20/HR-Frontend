import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { InventoryPermitModel } from 'src/app/models/permits/inventory-permit.model';
import { InventoryPermitEntryModel } from 'src/app/models/permits/inventory-permit-entry.model';
import { MainPurchaseClassModel } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { MainSalesClassModel } from 'src/app/models/sales-classes-tree/mainSalesClass.model';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { InventoryPermitService } from 'src/app/services/permits/inventory-permit.service';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { forkJoin } from 'rxjs';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';
import { formatDateOnlyToString } from 'src/app/utils/dateUtils';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
interface TransferItem {
  product: MainPurchaseClassModel | MainSalesClassModel;
  quantity: number;
  permitEntryId?: string;
  batchNo?: string | null;
  expiryDate?: Date | string | null;
  availableQuantity?: number;
  shelfNumber?: string;
  rowNumber?: string;
  // الموقع الجديد في المخزن الوجهة
  destinationShelfNumber?: string;
  destinationRowNumber?: string;
}

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
  selector: 'app-store-transfer',
  templateUrl: './store-transfer.component.html',
  styleUrl: './store-transfer.component.scss',
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
    DialogModule,
    InputNumberModule,
    TranslateModule
  ],
  providers: [MessageService]
})
export class StoreTransferComponent implements OnInit {
  loadingSignal = signal(false);
  showProductDialog = false;
  
  stores: StoreDetailsModel[] = [];
  products: (MainPurchaseClassModel | MainSalesClassModel)[] = [];
  storeProducts: StoreProduct[] = []; // منتجات المخزن المختار مع تواريخ الصلاحية
  accounts: any[] = [];
  
  transferData = {
    referenceNumber: '',
    description: '',
    transferDate: new Date(),
    fromStoreId: '',
    toStoreId: '',
    shippingCost: 0,
    mainAccountId: '',
    items: [] as TransferItem[]
  };
  
  selectedProduct: MainPurchaseClassModel | MainSalesClassModel | null = null;
  selectedStoreProduct: StoreProduct | null = null; // المنتج المختار من المخزن
  productQuantity: number = 1;
  
  // حقول الموقع الجديد في المخزن الوجهة
  destinationShelfNumber: string = '';
  destinationRowNumber: string = '';
  
  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  constructor(
    private storeDetailsService: StoreDetailsService,
    private inventoryPermitService: InventoryPermitService,
    private purchaseClassService: MainPurchaseClassService,
    private salesClassService: MainSalesClassService,
    private mainAccountService: MainAccountService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStores();
    this.loadProducts();
    this.loadAccounts();
  }

  loadStores(): void {
    this.loading = true;
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        this.stores = stores.map(store => new StoreDetailsModel(store));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stores:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل المخازن'
        });
      }
    });
  }

  loadAccounts(): void {
    this.mainAccountService.getAll().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        if (accounts.length > 0) {
          this.transferData.mainAccountId = accounts[0].id;
        }
      }
    });
  }

  // تحميل منتجات المخزن المختار مع تواريخ الصلاحية (كل إذن دخول منفصل)
  onFromStoreChange(): void {
    if (!this.transferData.fromStoreId) {
      this.storeProducts = [];
      this.transferData.items = [];
      return;
    }

    this.loading = true;
    this.storeProducts = [];
    this.transferData.items = []; // مسح العناصر السابقة عند تغيير المخزن
    
    this.inventoryPermitService.getByStoreId(this.transferData.fromStoreId).subscribe({
      next: (permits) => {
        console.log('Store permits for transfer:', permits);
        
        if (!permits || !Array.isArray(permits)) {
          this.storeProducts = [];
          this.loading = false;
          return;
        }

        // جمع أذونات الدخول مع مفتاح فريد (productId + expiryDate + shelfNumber)
        const entryItemsMap = new Map<string, StoreProduct>();
        
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
                      batchNo,
                      expiryDate: entry.expiryDate || null,
                      shelfNumber: entry.shelfNumber || '',
                      rowNumber: entry.rowNumber || '',
                      permitEntryId: entry.id,
                      product: product,
                      _isPurchaseClass: !!entry.mainPurchaseClass
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
        exitItems.forEach(exitItem => {
          let entryItem = entryItemsMap.get(exitItem.uniqueKey);
          
          if (entryItem) {
            entryItem.quantity -= exitItem.quantity;
          } else {
            // إذا لم نجد تطابق تام، نبحث عن أي إذن دخول لنفس المنتج
            for (const [key, item] of entryItemsMap.entries()) {
              if (item.productId === exitItem.productId && item.quantity > 0) {
                const deductAmount = Math.min(item.quantity, exitItem.quantity);
                item.quantity -= deductAmount;
                exitItem.quantity -= deductAmount;
                if (exitItem.quantity <= 0) break;
              }
            }
          }
        });

        // تحويل الخريطة إلى مصفوفة وإزالة العناصر ذات الكمية صفر أو أقل
        const resultArray = Array.from(entryItemsMap.values()).filter(item => item.quantity > 0);

        console.log('Store products for transfer after deducting exits:', resultArray);
        this.storeProducts = resultArray;
        this.loading = false;
        
        if (this.storeProducts.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'معلومة',
            detail: 'لا توجد أصناف في هذا المخزن'
          });
        }
      },
      error: (error) => {
        console.error('Error loading store products:', error);
        this.loading = false;
        this.storeProducts = [];
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل أصناف المخزن'
        });
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.purchaseClassService.getAll().subscribe({
      next: (purchaseClasses) => {
        console.log('Purchase Classes:', purchaseClasses);
        // Mark each purchase class with a type identifier
        const markedPurchaseClasses = purchaseClasses.map(pc => {
          (pc as any)._isPurchaseClass = true;
          return pc;
        });
        
        this.salesClassService.getAll().subscribe({
          next: (salesClasses) => {
            console.log('Sales Classes:', salesClasses);
            // Mark each sales class with a type identifier
            const markedSalesClasses = salesClasses.map(sc => {
              (sc as any)._isPurchaseClass = false;
              return sc;
            });
            this.products = [...markedPurchaseClasses, ...markedSalesClasses];
            console.log('Total Products:', this.products.length);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading sales classes:', error);
            this.products = [...markedPurchaseClasses];
            this.loading = false;
            this.messageService.add({
              severity: 'warn',
              summary: 'تحذير',
              detail: 'تم تحميل أصناف الشراء فقط'
            });
          }
        });
      },
      error: (error) => {
        console.error('Error loading purchase classes:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل الأصناف'
        });
      }
    });
  }

  openProductDialog(): void {
    if (!this.transferData.fromStoreId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء اختيار المخزن المصدر أولاً'
      });
      return;
    }
    
    if (this.storeProducts.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد أصناف متاحة في المخزن المختار'
      });
      return;
    }
    
    console.log('Opening product dialog, store products count:', this.storeProducts.length);
    this.selectedStoreProduct = null;
    this.productQuantity = 1;
    this.showProductDialog = true;
  }

  addProductToTransfer(): void {
    if (!this.selectedStoreProduct || !this.productQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء اختيار المنتج والكمية'
      });
      return;
    }

    // التحقق من أن الكمية المطلوبة لا تتجاوز الكمية المتاحة
    if (this.productQuantity > this.selectedStoreProduct.quantity) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: `الكمية المتاحة هي ${this.selectedStoreProduct.quantity} فقط`
      });
      return;
    }

    // التحقق من أن المنتج غير مضاف مسبقاً (بنفس permitEntryId)
    const existingItem = this.transferData.items.find(
      item => item.permitEntryId === this.selectedStoreProduct!.permitEntryId
    );
    
    if (existingItem) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'هذا المنتج مضاف بالفعل، يمكنك تعديل الكمية'
      });
      return;
    }

    console.log('=== Adding Product to Transfer ===');
    console.log('Selected Store Product:', this.selectedStoreProduct);
    console.log('ExpiryDate:', this.selectedStoreProduct.expiryDate);
    console.log('ShelfNumber:', this.selectedStoreProduct.shelfNumber);
    console.log('RowNumber:', this.selectedStoreProduct.rowNumber);
    console.log('Destination ShelfNumber:', this.destinationShelfNumber);
    console.log('Destination RowNumber:', this.destinationRowNumber);
    
    this.transferData.items.push({
      product: this.selectedStoreProduct.product!,
      quantity: this.productQuantity,
      permitEntryId: this.selectedStoreProduct.permitEntryId,
      batchNo: this.selectedStoreProduct.batchNo,
      expiryDate: this.selectedStoreProduct.expiryDate,
      availableQuantity: this.selectedStoreProduct.quantity,
      shelfNumber: this.selectedStoreProduct.shelfNumber,
      rowNumber: this.selectedStoreProduct.rowNumber,
      // الموقع الجديد في المخزن الوجهة
      destinationShelfNumber: this.destinationShelfNumber || this.selectedStoreProduct.shelfNumber,
      destinationRowNumber: this.destinationRowNumber || this.selectedStoreProduct.rowNumber
    });

    // تحديث الكمية المتاحة في قائمة المنتجات
    const storeProductIndex = this.storeProducts.findIndex(
      sp => sp.permitEntryId === this.selectedStoreProduct!.permitEntryId
    );
    if (storeProductIndex > -1) {
      this.storeProducts[storeProductIndex].quantity -= this.productQuantity;
      // إذا أصبحت الكمية صفر، نزيل المنتج من القائمة
      if (this.storeProducts[storeProductIndex].quantity <= 0) {
        this.storeProducts.splice(storeProductIndex, 1);
      }
    }

    this.showProductDialog = false;
    this.selectedStoreProduct = null;
    this.productQuantity = 1;
    this.destinationShelfNumber = '';
    this.destinationRowNumber = '';
  }

  removeProduct(index: number): void {
    const removedItem = this.transferData.items[index];
    
    // إعادة الكمية للمنتج في قائمة المنتجات
    if (removedItem.permitEntryId) {
      const existingProduct = this.storeProducts.find(
        sp => sp.permitEntryId === removedItem.permitEntryId
      );
      
      if (existingProduct) {
        existingProduct.quantity += removedItem.quantity;
      } else {
        // إعادة إضافة المنتج إذا تم حذفه
        this.storeProducts.push({
          productId: (removedItem.product as any).id,
          productName: (removedItem.product as any).arabicName || 'غير محدد',
          productCode: (removedItem.product as any).referenceCode || '-',
          quantity: removedItem.quantity,
          unitName: (removedItem.product as any).measurementUnit?.arabicName || '-',
          batchNo: removedItem.batchNo || null,
          expiryDate: removedItem.expiryDate || null,
          shelfNumber: removedItem.shelfNumber || '',
          rowNumber: removedItem.rowNumber || '',
          permitEntryId: removedItem.permitEntryId,
          product: removedItem.product,
          _isPurchaseClass: !!(removedItem.product as any).mainPurchaseClassName
        });
      }
    }
    
    this.transferData.items.splice(index, 1);
  }

  saveTransfer(): void {
    if (!this.transferData.fromStoreId || !this.transferData.toStoreId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء اختيار المخزن المصدر والمخزن الهدف'
      });
      return;
    }

    if (this.transferData.fromStoreId === this.transferData.toStoreId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا يمكن النقل من نفس المخزن إلى نفسه'
      });
      return;
    }

    if (!this.transferData.items || this.transferData.items.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء إضافة منتجات للنقل'
      });
      return;
    }

    if (!this.transferData.mainAccountId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء اختيار الحساب'
      });
      return;
    }

    this.loading = true;
    
    console.log('=== TRANSFER DATA ===');
    console.log('From Store:', this.transferData.fromStoreId);
    console.log('To Store:', this.transferData.toStoreId);
    console.log('Account:', this.transferData.mainAccountId);
    console.log('Items Count:', this.transferData.items.length);
    
    // Log each item
    this.transferData.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        productId: item.product.id,
        productName: item.product.arabicName,
        productCode: item.product.referenceCode,
        quantity: item.quantity
      });
    });
    
    // Helper function to determine if it's a purchase or sales class
    const getClassType = (product: any): 'purchase' | 'sales' => {
      console.log('Product check:', product.mainPurchaseClassName || product.mainSalesClassName, '_isPurchaseClass:', product._isPurchaseClass);
      // Use the explicit marker set during loadProducts
      if (product._isPurchaseClass === true) {
        return 'purchase';
      }
      if (product._isPurchaseClass === false) {
        return 'sales';
      }
      // Fallback checks
      if (product.detailPurchaseClassId !== undefined || product.mainPurchaseClassName !== undefined) {
        return 'purchase';
      }
      return 'sales';
    };

    // Use single timestamp for both permits to ensure they can be paired
    const transferTimestamp = Date.now();
    const baseRef = this.transferData.referenceNumber || String(transferTimestamp);
    
    // Create Exit Permit from source store
    const exitPermit = new InventoryPermitModel({
      referenceNumber: `EXIT-${baseRef}`,
      description: `نقل إلى: ${this.stores.find(s => s.id === this.transferData.toStoreId)?.arabicName} - ${this.transferData.description || ''}`,
      permitDate: this.transferData.transferDate,
      permitType: 'Exit',
      storeDetailsId: this.transferData.fromStoreId,
      mainAccountId: this.transferData.mainAccountId,
      shippingCost: this.transferData.shippingCost || 0,
      permitEntries: this.transferData.items.map(item => {
        // تحويل تاريخ الصلاحية لصيغة YYYY-MM-DD المطلوبة من الـ backend
        let formattedExpiryDate: string | undefined = undefined;
        if (item.expiryDate) {
          formattedExpiryDate = formatDateOnlyToString(item.expiryDate) || undefined;
        }
        
        const entry = new InventoryPermitEntryModel({
          quantity: item.quantity,
          unitPrice: 1,
          // تمرير معلومات الصلاحية والرف للطرح الصحيح
          expiryDate: formattedExpiryDate,
          batchNo: item.batchNo || undefined,
          shelfNumber: item.shelfNumber || undefined,
          rowNumber: item.rowNumber || undefined
        });
        
        const classType = getClassType(item.product);
        if (classType === 'purchase') {
          entry.mainPurchaseClassId = item.product.id;
        } else {
          entry.mainSalesClassId = item.product.id;
        }
        
        console.log('Exit Entry:', {
          productName: item.product.arabicName,
          classType,
          mainPurchaseClassId: entry.mainPurchaseClassId,
          mainSalesClassId: entry.mainSalesClassId,
          quantity: entry.quantity,
          unitPrice: entry.unitPrice,
          expiryDate: entry.expiryDate,
          shelfNumber: entry.shelfNumber,
          rowNumber: entry.rowNumber
        });
        
        return entry;
      })
    });

    // Create Entry Permit to destination store
    const entryPermit = new InventoryPermitModel({
      referenceNumber: `ENTRY-${baseRef}`,
      description: `نقل من: ${this.stores.find(s => s.id === this.transferData.fromStoreId)?.arabicName} - ${this.transferData.description || ''}`,
      permitDate: this.transferData.transferDate,
      permitType: 'Entry',
      storeDetailsId: this.transferData.toStoreId,
      mainAccountId: this.transferData.mainAccountId,
      permitEntries: this.transferData.items.map(item => {
        // تحويل تاريخ الصلاحية لصيغة YYYY-MM-DD المطلوبة من الـ backend
        let formattedExpiryDate: string | undefined = undefined;
        if (item.expiryDate) {
          formattedExpiryDate = formatDateOnlyToString(item.expiryDate) || undefined;
        }
        
        const entry = new InventoryPermitEntryModel({
          quantity: item.quantity,
          unitPrice: 1,
          // تمرير معلومات الصلاحية والرف للمخزن الهدف (الموقع الجديد)
          expiryDate: formattedExpiryDate,
          batchNo: item.batchNo || undefined,
          shelfNumber: item.destinationShelfNumber || item.shelfNumber || undefined,
          rowNumber: item.destinationRowNumber || item.rowNumber || undefined
        });
        
        const classType = getClassType(item.product);
        if (classType === 'purchase') {
          entry.mainPurchaseClassId = item.product.id;
        } else {
          entry.mainSalesClassId = item.product.id;
        }
        
        return entry;
      })
    });

    console.log('=== TRANSFER DATA ===');
    console.log('From Store:', this.transferData.fromStoreId);
    console.log('To Store:', this.transferData.toStoreId);
    console.log('Account:', this.transferData.mainAccountId);
    console.log('Items:', this.transferData.items);
    
    console.log('=== EXIT PERMIT ===');
    console.log(exitPermit);
    console.log('Exit Permit JSON:', JSON.stringify(exitPermit, null, 2));
    
    console.log('=== ENTRY PERMIT ===');
    console.log(entryPermit);
    console.log('Entry Permit JSON:', JSON.stringify(entryPermit, null, 2));

    // Validate permits before sending
    const exitValid = exitPermit.validate();
    const entryValid = entryPermit.validate();
    
    console.log('Exit Permit Valid:', exitValid);
    console.log('Entry Permit Valid:', entryValid);
    
    if (!exitValid) {
      console.error('Exit permit validation failed');
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'بيانات إذن الخروج غير مكتملة'
      });
      return;
    }

    if (!entryValid) {
      console.error('Entry permit validation failed');
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'بيانات إذن الدخول غير مكتملة'
      });
      return;
    }

    // Clean up undefined properties before sending
    const cleanPermit = (permit: InventoryPermitModel) => {
      // Format date to YYYY-MM-DD (DateOnly format for backend)
      let permitDateString: string;
      if (permit.permitDate instanceof Date) {
        const year = permit.permitDate.getFullYear();
        const month = String(permit.permitDate.getMonth() + 1).padStart(2, '0');
        const day = String(permit.permitDate.getDate()).padStart(2, '0');
        permitDateString = `${year}-${month}-${day}`;
      } else if (typeof permit.permitDate === 'string') {
        // If already string, extract date part only
        permitDateString = permit.permitDate.split('T')[0];
      } else {
        permitDateString = formatDateOnlyToString(new Date());
      }
      
      // Create new InventoryPermitModel instance with clean data
      const cleanedPermit = new InventoryPermitModel({
        referenceNumber: permit.referenceNumber,
        description: permit.description || '',
        permitDate: permitDateString,
        permitType: permit.permitType,
        storeDetailsId: permit.storeDetailsId,
        mainAccountId: permit.mainAccountId,
        shippingCost: permit.shippingCost || 0,
        permitEntries: permit.permitEntries.map(entry => new InventoryPermitEntryModel({
          quantity: entry.quantity,
          unitPrice: entry.unitPrice || 0,
          mainPurchaseClassId: entry.mainPurchaseClassId || null,
          mainSalesClassId: entry.mainSalesClassId || null,
          // تمرير بيانات الصلاحية والموقع
          expiryDate: entry.expiryDate || null,
          batchNo: entry.batchNo || null,
          shelfNumber: entry.shelfNumber || null,
          rowNumber: entry.rowNumber || null
        }))
      });
      
      return cleanedPermit;
    };

    const cleanExitPermit = cleanPermit(exitPermit);
    const cleanEntryPermit = cleanPermit(entryPermit);
    
    console.log('Clean Exit Permit:', cleanExitPermit);
    console.log('Clean Entry Permit:', cleanEntryPermit);

    // Send Exit Permit first
    console.log('Sending Exit Permit...');
    this.inventoryPermitService.create(cleanExitPermit).subscribe({
      next: (exitResult) => {
        console.log('Exit Permit Created Successfully:', exitResult);
        
        // Now send Entry Permit
        console.log('Sending Entry Permit...');
        this.inventoryPermitService.create(cleanEntryPermit).subscribe({
          next: (entryResult) => {
            console.log('Entry Permit Created Successfully:', entryResult);
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم حفظ عملية النقل بنجاح'
            });
            this.loading = false;
            // Navigate back to transfers list
            setTimeout(() => {
              this.router.navigate(['/inventory/transfer']);
            }, 1500);
          },
          error: (entryError) => {
            console.error('=== ENTRY PERMIT ERROR ===');
            console.error('Full Error:', entryError);
            console.error('Error Response:', entryError.error);
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ في إذن الدخول',
              detail: entryError.error?.message || entryError.message || 'فشل حفظ إذن الدخول'
            });
          }
        });
      },
      error: (exitError) => {
        console.error('=== EXIT PERMIT ERROR ===');
        console.error('Full Error Object:', exitError);
        
        // The HttpInterceptor catches the real HttpErrorResponse
        // But we're receiving a string "Bad Request" here
        // Let's log what we have
        console.error('Error Type:', typeof exitError);
        console.error('Error Constructor:', exitError?.constructor?.name);
        
        // Try to extract validation errors if it's an HttpErrorResponse
        if (exitError && typeof exitError === 'object' && exitError.error) {
          console.error('✅ Found error.error:', exitError.error);
          
          if (exitError.error.errors) {
            console.error('✅✅ VALIDATION ERRORS:', exitError.error.errors);
            console.error('VALIDATION ERRORS JSON:', JSON.stringify(exitError.error.errors, null, 2));
          }
          
          if (exitError.error.title) {
            console.error('Error Title:', exitError.error.title);
          }
        } else {
          console.error('❌ exitError is not an object or has no error property');
          console.error('exitError value:', exitError);
        }
        
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ في إذن الخروج',
          detail: exitError.error?.title || exitError.message || exitError || 'فشل حفظ إذن الخروج'
        });
      }
    });
  }

  resetForm(): void {
    this.transferData = {
      referenceNumber: '',
      description: '',
      transferDate: new Date(),
      fromStoreId: '',
      toStoreId: '',
      shippingCost: 0,
      mainAccountId: this.accounts.length > 0 ? this.accounts[0].id : '',
      items: []
    };
  }

  getProductName(item: TransferItem): string {
    return item.product.arabicName || 'غير محدد';
  }

  getProductCode(item: TransferItem): string {
    return item.product.referenceCode || '-';
  }

  getProductUnit(item: TransferItem): string {
    return item.product.measurementUnit?.arabicName || '-';
  }
}

