import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { ReturnNo } from 'src/app/models/return/returnNo';

import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { PurchaseReturnService } from 'src/app/services/purchaseReturn/purchase-return.service';
import { PurchaseReturnItem } from 'src/app/models/purchaseReturn/purchaseReturnItem';
import { PurchaseReturn } from 'src/app/models/purchaseReturn/purchaseReturn';
import { TranslationService } from "../../../modules/i18n";
import { debounceTime, distinctUntilChanged, forkJoin } from "rxjs";
import { StoreDetailsService } from "../../../services/inventory/store-details.service";
import { SupplierDetailsService } from "../../../services/inventory/supplier-details.service";
import { PurchaseInvoiceService } from "../../../services/purchaseInvoice/purchase-invoice.service";
import { InventoryStocksService } from "../../../services/reports/inventory-stocks.service";
import { InputSwitchModule } from "primeng/inputswitch";
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { formatDateToUTCString, getSystemNow } from 'src/app/utils/dateUtils';

@Component({
  selector: 'app-purchase-return-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, TranslateModule, DropdownModule, InputSwitchModule, CalendarModule, ConfirmDialogModule, ButtonModule, ToastModule, BackButtonComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './purchase-return-form.component.html',
  styleUrls: ['./purchase-return-form.component.scss']
})
export class PurchaseReturnFormComponent implements OnInit {
  taxAppliedSignal = signal<boolean>(true);
  get taxApplied() {
    return this.taxAppliedSignal()
  }
  set taxApplied(value: boolean) {
    this.taxAppliedSignal.set(value)
  }
  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal()
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value)
  }
  @ViewChild('returnModal') returnModal: ElementRef | undefined;
  private modalInstance: Modal | undefined;

  returnForm: FormGroup;
  returnId: number;
  returnNo: ReturnNo | null = null;
  isMinimized = false;
  isMaximized = false;
  suppliers: any[] = [];
  mainPurchaseArray: any[] = [];
  stores: any[] = [];
  purchaseInvoices: any[] = [];
  storeId = null;
  inventoryStocks: any[] = [];
  availableQuantities: { [key: string]: number } = {}; // تخزين الكميات المتاحة لكل عنصر

  translate: TranslateService;
  activeLanguage: string = "en";
  isEditMode: boolean = false;
  constructor(
    private purchaseClassService: MainPurchaseClassService,
    private fb: FormBuilder,
    private purchaseReturnService: PurchaseReturnService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private storeDetailsService: StoreDetailsService,
    private supplierService: SupplierDetailsService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private inventoryStocksService: InventoryStocksService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,

  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.route.paramMap.subscribe(params => {
      this.returnId = params.get('id') ? parseInt(params.get('id')!, 10) : null;
      if (this.returnId) {
        this.isEditMode = true;
      }
    });

    this.initiateForm();

  }

  initiateForm() {
    this.returnForm = this.fb.group({
      id: [this.returnId],
      returnNo: [],
      currency: ['SAR'],
      supplierDetailsId: [''],
      description: [''],
      issueDate: [getSystemNow()],
      dueDate: [getSystemNow()],
      tax: [0],
      taxAmount: [0],
      discountType: ['percentage'],
      discount: [0, [Validators.min(0)]],
      discountAmount: [0],
      totalPrice: [0],
      netPrice: [0],
      purchaseInvoiceId: [''],
      storeDetailsId: [''], // إضافة المخزن الافتراضي
      purchaseReturnItems: this.fb.array([])
    });

    this.returnForm.get('issueDate')?.valueChanges.subscribe((newIssueDate) => {
      if (newIssueDate) {
        this.returnForm.get('dueDate')?.setValue(newIssueDate, { emitEvent: false });
      }
    });
  }

  //#region Modal
  toggleModalSize() {
    if (this.returnModal) {
      const modalElement = this.returnModal.nativeElement.querySelector('.modal-dialog'); // Target the modal dialog

      if (this.isMaximized) {

        this.isMaximized = false;
        this.isMinimized = false;
        modalElement.classList.remove('modal-lg');
      } else if (this.isMinimized) {

        this.isMinimized = false;
        this.isMaximized = true;
        modalElement.classList.add('modal-lg');
      } else {
        // Minimize the modal by resetting classes
        this.isMinimized = true;
        this.isMaximized = false;
        modalElement.classList.remove('modal-lg'); // Ensure it's at default size when minimized
      }
    }
  }


  openModal() {
    if (this.returnModal) {
      this.modalInstance = new Modal(this.returnModal.nativeElement);
      this.modalInstance.show();
    }
  }

  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  //#endregion

  ngOnInit(): void {
    this.loadData();
    if (!this.returnId) {
      this.generateReturnNum();
    }

  }

  initReturnForm() {
    if (this.returnId) {
      this.purchaseReturnService.getReturnById(this.returnId).subscribe((purchaseReturn) => {
        this.returnForm.patchValue({
          ...purchaseReturn,
          issueDate: new Date(purchaseReturn.issueDate),
          dueDate: new Date(purchaseReturn.dueDate)
        });
        const hasTax = purchaseReturn.purchaseReturnItems.every(item => item.tax);
        if (!hasTax) {
          this.taxApplied = false;
          this.toggleApplyTax({ checked: false })
        } else {
          this.taxApplied = true;
          this.toggleApplyTax({ checked: true })
        }
        purchaseReturn.purchaseReturnItems?.forEach(item => {
          console.log(item)
          this.addItem(item)
        });
        this.cdr.detectChanges();
      });
    } else {

      // Load 10 empty purchaseReturnItems with placeholder values
      for (let i = 0; i < 10; i++) {
        this.addItem({
          id: null,
          itemNo: '',
          mainPurchaseClassId: null,
          price: null,
          quantity: null,
          tax: 15,
          taxAmount: 0,
          discount: 0,
          discountAmount: 0,
          totalPrice: 0,
          netPrice: 0,
          purchaseReturnId: this.returnId,
          storeDetailsId: '',
        });
      }
      this.cdr.detectChanges()
    }

    this.updateReturnTotals();
    // this.returnForm.get('discount')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateReturnTotals());
    // this.returnForm.get('discountType')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateReturnTotals());

    // this.purchaseReturnItems.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateReturnTotals());

  }



  private generateReturnNum() {
    this.purchaseReturnService.getReturnNumber().subscribe({
      next: (val) => {
        this.returnNo = val;
        this.returnForm.controls['returnNo'].setValue(this.returnNo?.returnNo);
      },
      error: (err) => {
        console.error('Error generating return number', err);
      }
    });
  }



  private filterValidItems(): any[] {
    return this.purchaseReturnItems.controls
      .filter(item => {

        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;


        return price && quantity && (price > 0 && quantity > 0);
      })
      .map(item => {
        this.updateItemValues(item as FormGroup);
        return item.value;
      });
  }




  updateItemValues(item: FormGroup): void {
    const price = parseFloat(item.get('price')?.value) || 0;
    const quantity = parseFloat(item.get('quantity')?.value) || 0;
    const itemDiscount = parseFloat(item.get('discount')?.value) || 0;
    const taxRate = this.taxApplied ? 15 : 0;

    const grossPrice = price * quantity; // Calculate Gross Price
    const discountAmount = (grossPrice * itemDiscount) / 100; // Calculate Discount
    const netPrice = grossPrice - discountAmount; // Calculate Net Price
    const taxAmount = (netPrice * taxRate) / 100; // Calculate Tax Amount
    const totalPrice = netPrice + taxAmount; // Calculate Total Price

    // Patch the form values with calculated amounts
    // item.patchValue({
    //   netPrice: parseFloat(netPrice.toFixed(2)),
    //   discountAmount: parseFloat(discountAmount.toFixed(2)),
    //   taxAmount: parseFloat(taxAmount.toFixed(2)),
    //   totalPrice: parseFloat(totalPrice.toFixed(2)),
    // });

    item.get('netPrice').setValue(parseFloat(netPrice.toFixed(2)))
    item.get('discountAmount').setValue(parseFloat(discountAmount.toFixed(2)))
    item.get('taxAmount').setValue(parseFloat(taxAmount.toFixed(2)))
    item.get('totalPrice').setValue(parseFloat(totalPrice.toFixed(2)))

  }



  updateReturnTotals(): void {
    const filteredItems = this.filterValidItems();

    const totalReturnPrice = filteredItems.reduce((total, item) => total + (item.totalPrice || 0), 0);
    const totalNetPrice = filteredItems.reduce((total, item) => total + (item.netPrice || 0), 0);
    const totalTaxAmount = filteredItems.reduce((total, item) => total + (this.taxApplied ? item.taxAmount : 0), 0);

    const discountType = this.returnForm.get('discountType')?.value;
    const returnDiscountValue = parseFloat(this.returnForm.get('discount')?.value) || 0;

    let returnDiscountAmount = 0;

    if (discountType === 'percentage') {
      returnDiscountAmount = (totalReturnPrice * returnDiscountValue) / 100;
    } else if (discountType === 'amount') {
      returnDiscountAmount = returnDiscountValue;
    }

    const netPriceAfterDiscount = totalNetPrice - returnDiscountAmount;
    const totalPriceAfterDiscount = totalNetPrice + totalTaxAmount - returnDiscountAmount;

    this.returnForm.get('totalPrice').setValue(parseFloat(totalPriceAfterDiscount.toFixed(2)))
    this.returnForm.get('netPrice').setValue(parseFloat(netPriceAfterDiscount.toFixed(2)))
    this.returnForm.get('taxAmount').setValue(parseFloat(totalTaxAmount.toFixed(2)))
    this.returnForm.get('discountAmount').setValue(parseFloat(returnDiscountAmount.toFixed(2)))
    // this.returnForm.patchValue({
    //   totalPrice: parseFloat(totalPriceAfterDiscount.toFixed(2)),
    //   netPrice: parseFloat(netPriceAfterDiscount.toFixed(2)),
    //   taxAmount: parseFloat(totalTaxAmount.toFixed(2)),
    //   discountAmount: parseFloat(returnDiscountAmount.toFixed(2)),
    // });

    this.cdr.detectChanges();
  }


  onDiscountTypeChange(event: any): void {
    const discountType = event.target.value;


    this.returnForm.patchValue({ discount: 0 });


    this.updateReturnTotals();
  }


  get purchaseReturnItems(): FormArray {
    return this.returnForm.get('purchaseReturnItems') as FormArray;
  }


  private itemCounter = 1;

  addItem(purchaseReturnItem: PurchaseReturnItem = null): void {
    const itemFormGroup = this.fb.group({
      id: [purchaseReturnItem?.id ?? null],
      itemNo: [{ value: '', disabled: true }], // Set itemNo as a disabled field if it's auto-generated
      mainPurchaseClassId: [purchaseReturnItem?.mainPurchaseClassId],
      price: [purchaseReturnItem?.price, [Validators.required, Validators.min(0)]],
      quantity: [purchaseReturnItem?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      discount: [purchaseReturnItem?.discount ?? 0, [Validators.min(0)]],
      discountAmount: [purchaseReturnItem?.discountAmount ?? 0],
      netPrice: [purchaseReturnItem?.netPrice ?? 0],
      tax: [purchaseReturnItem?.tax ?? 15],
      taxAmount: [purchaseReturnItem?.taxAmount ?? 0],
      totalPrice: [purchaseReturnItem?.totalPrice ?? 0],
      purchaseReturnId: [this.returnId],
      storeDetailsId: [purchaseReturnItem?.storeDetailsId],
      unit: purchaseReturnItem?.mainPurchaseClassId
        ? this.activeLanguage === "en"
          ? purchaseReturnItem.mainPurchaseClass.measurementUnit.englishSymbol
          : purchaseReturnItem.mainPurchaseClass.measurementUnit.arabicSymbol
        : ''
    });

    // Add the form group to the form array
    this.purchaseReturnItems.push(itemFormGroup);

    // Add value change subscriptions with debounce and avoid recursive triggers
    itemFormGroup.get('price')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.safeUpdateReturnTotals();
      });

    itemFormGroup.get('quantity')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.safeUpdateReturnTotals();
      });

    itemFormGroup.get('discount')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.safeUpdateReturnTotals();
      });

    // Update totals initially
    this.safeUpdateReturnTotals();
  }

  private safeUpdateReturnTotals(): void {
    // Ensure no recursive triggering of updates
    try {
      this.updateReturnTotals();
    } catch (error) {
      console.error('Error during updateReturnTotals:', error);
    }
  }



  removeItem(index: number): void {
    this.purchaseReturnItems.removeAt(index);
    this.updateReturnTotals();
    this.cdr.detectChanges();
  }

  onPurchaseClick(event: any, item: AbstractControl<any, any>) {
    const purchaseId = event.value

    const purchaseObject = this.mainPurchaseArray.find(x => x.id === purchaseId);

    item.get('unit')?.setValue(purchaseObject?.measurementUnit?.arabicSymbol);
    this.cdr.detectChanges()

  }

 
  async getAvailableQuantity(item: AbstractControl): Promise<number> {
    const storeDetailsId = item.get('storeDetailsId')?.value;
    const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;

    if (!storeDetailsId || !mainPurchaseClassId) {
      return 0;
    }

    try {
      const inventoryStocks = await this.inventoryStocksService.getInventoryStocks(storeDetailsId).toPromise();
      
      if (!inventoryStocks || inventoryStocks.length === 0) {
        return 0;
      }

      const storeStock = inventoryStocks.find(stock => stock.storeDetailsId === storeDetailsId);
      if (!storeStock || !storeStock.storedItems) {
        return 0;
      }

      const productStock = storeStock.storedItems.find(storedItem => storedItem.mainPurchaseClassId === mainPurchaseClassId);
      return productStock ? (productStock.quantity || 0) : 0;
    } catch (error) {
      console.error('Error getting available quantity:', error);
      return 0;
    }
  }

  getAvailableQuantitySync(item: AbstractControl): number {
    const storeDetailsId = item.get('storeDetailsId')?.value;
    const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
    
    if (!storeDetailsId || !mainPurchaseClassId) {
      return 0;
    }
    
    const key = `${storeDetailsId}_${mainPurchaseClassId}`;
    return this.availableQuantities[key] || 0;
  }

 
  async updateAvailableQuantity(item: AbstractControl, index: number): Promise<void> {
    const storeDetailsId = item.get('storeDetailsId')?.value;
    const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
    
    if (!storeDetailsId || !mainPurchaseClassId) {
      return;
    }
    
    const key = `${storeDetailsId}_${mainPurchaseClassId}`;
    const availableQuantity = await this.getAvailableQuantity(item);
    this.availableQuantities[key] = availableQuantity;
    this.cdr.detectChanges();
  }


  isQuantityExceeded(item: AbstractControl): boolean {
    return item.get('quantity')?.errors?.['exceedsAvailable'] || false;
  }

 
  async onQuantityChange(item: AbstractControl, index: number): Promise<void> {
    const requestedQuantity = parseFloat(item.get('quantity')?.value) || 0;
    const availableQuantity = this.getAvailableQuantitySync(item);
    
    if (requestedQuantity > availableQuantity) {
      item.get('quantity')?.setErrors({ 'exceedsAvailable': true });
    } else {
      const currentErrors = item.get('quantity')?.errors;
      if (currentErrors && currentErrors['exceedsAvailable']) {
        delete currentErrors['exceedsAvailable'];
        if (Object.keys(currentErrors).length === 0) {
          item.get('quantity')?.setErrors(null);
        } else {
          item.get('quantity')?.setErrors(currentErrors);
        }
      }
    }
    
    this.cdr.detectChanges();
  }

  
  isFormValid(): boolean {
    if (!this.returnForm.valid) {
      return false;
    }

    for (let i = 0; i < this.purchaseReturnItems.length; i++) {
      const item = this.purchaseReturnItems.at(i);
      
      if (item.get('quantity')?.errors?.['exceedsAvailable']) {
        return false;
      }
      
      if (item.get('quantity')?.invalid || item.get('price')?.invalid) {
        return false;
      }
    }

    return true;
  }

 
  async validateInventoryQuantity(storeDetailsId: string, mainPurchaseClassId: string, requestedQuantity: number): Promise<{isValid: boolean, availableQuantity: number, message: string}> {
    try {
      const inventoryStocks = await this.inventoryStocksService.getInventoryStocks(storeDetailsId).toPromise();
      
      if (!inventoryStocks || inventoryStocks.length === 0) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? 'لا توجد بيانات مخزون متاحة للمخزن المحدد' 
            : 'No inventory data available for the selected store'
        };
      }

      const storeStock = inventoryStocks.find(stock => stock.storeDetailsId === storeDetailsId);
      
      if (!storeStock || !storeStock.storedItems) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? 'لا توجد منتجات في المخزن المحدد' 
            : 'No products found in the selected store'
        };
      }

      const productStock = storeStock.storedItems.find(item => item.mainPurchaseClassId === mainPurchaseClassId);
      
      if (!productStock) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? `المنتج غير موجود في المخزن. الكمية المتاحة: 0` 
            : `Product not found in store. Available quantity: 0`
        };
      }

      const availableQuantity = productStock.quantity || 0;
      
      if (availableQuantity === 0) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? `المنتج غير متوفر في المخزن. الكمية المتاحة: ${availableQuantity}` 
            : `Product not available in store. Available quantity: ${availableQuantity}`
        };
      }

      if (requestedQuantity > availableQuantity) {
        return {
          isValid: false,
          availableQuantity: availableQuantity,
          message: this.activeLanguage === 'ar' 
            ? `الكمية المطلوبة (${requestedQuantity}) أكبر من الكمية المتاحة (${availableQuantity})` 
            : `Requested quantity (${requestedQuantity}) exceeds available quantity (${availableQuantity})`
        };
      }

      return {
        isValid: true,
        availableQuantity: availableQuantity,
        message: this.activeLanguage === 'ar' 
          ? `الكمية متاحة. الكمية المتاحة: ${availableQuantity}` 
          : `Quantity available. Available quantity: ${availableQuantity}`
      };

    } catch (error) {
      console.error('Error validating inventory quantity:', error);
      return {
        isValid: false,
        availableQuantity: 0,
        message: this.activeLanguage === 'ar' 
          ? 'خطأ في التحقق من المخزون' 
          : 'Error validating inventory'
      };
    }
  }

 
  async updateInventoryStocks(storeDetailsId: string): Promise<void> {
    if (!storeDetailsId) {
      this.inventoryStocks = [];
      return;
    }

    try {
      this.inventoryStocks = await this.inventoryStocksService.getInventoryStocks(storeDetailsId).toPromise() || [];
    } catch (error) {
      console.error('Error loading inventory stocks:', error);
      this.inventoryStocks = [];
    }
  }


  async submitForm(event: Event, isSaveAndContinue: boolean): Promise<void> {
    event.preventDefault(); // Prevent default form submission


    if (this.purchaseReturnItems.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'يجب إضافة عنصر واحد على الأقل' : 'At least one item must be added'
      });
      return;
    }

    if (!this.returnForm.get('supplierDetailsId')?.value) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'يجب اختيار المورد' : 'Supplier must be selected'
      });
      return;
    }

    if (!this.returnForm.get('storeDetailsId')?.value) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'يجب اختيار المخزن' : 'Store must be selected'
      });
      return;
    }

    if (!this.returnForm.get('purchaseInvoiceId')?.value) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'يجب اختيار فاتورة الشراء' : 'Purchase invoice must be selected'
      });
      return;
    }

    let hasValidItems = false;
    let hasAnyData = false;

    for (let i = 0; i < this.purchaseReturnItems.length; i++) {
      const item = this.purchaseReturnItems.at(i);
      const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const storeDetailsId = item.get('storeDetailsId')?.value;

      if (mainPurchaseClassId || price || quantity || storeDetailsId) {
        hasAnyData = true;
        
        if (mainPurchaseClassId && storeDetailsId && price && quantity && 
            price > 0 && quantity > 0 && 
            !isNaN(price) && !isNaN(quantity)) {
          hasValidItems = true;
        }
      }
    }

    if (!hasAnyData || !hasValidItems) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'يجب إدخال صنف واحد على الأقل' : 'Must enter at least one item'
      });
      return;
    }

    this.loading = true;
    for (let i = this.purchaseReturnItems.length - 1; i >= 0; i--) {
      const item = this.purchaseReturnItems.at(i);
      const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;

      if (!mainPurchaseClassId || !price || !quantity || 
          price <= 0 || quantity <= 0 || 
          isNaN(price) || isNaN(quantity)) {
        console.log(`Removing empty row ${i}: mainPurchaseClassId=${mainPurchaseClassId}, price=${price}, quantity=${quantity}`);
        this.purchaseReturnItems.removeAt(i);
      }
    }
    

    if (!this.isFormValid()) {
      this.loading = false;
      return;
    }


    const totalReturnPrice = this.purchaseReturnItems.controls.reduce((total, item) => total + (item.get('totalPrice')?.value || 0), 0);
    const totalNetPrice = this.purchaseReturnItems.controls.reduce((total, item) => total + (item.get('netPrice')?.value || 0), 0);
    const totalTaxAmount = this.purchaseReturnItems.controls.reduce((total, item) => total + (this.taxApplied ? item.get('taxAmount')?.value : 0), 0);
    const totalDiscountAmount = this.purchaseReturnItems.controls.reduce((total, item) => total + (item.get('discountAmount')?.value || 0), 0);

    if (totalReturnPrice <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'إجمالي الفاتورة يجب أن يكون أكبر من صفر' : 'Total invoice amount must be greater than zero'
      });
      this.loading = false;
      return;
    }

    if (totalNetPrice <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
        detail: this.activeLanguage === 'ar' ? 'صافي الفاتورة يجب أن يكون أكبر من صفر' : 'Net invoice amount must be greater than zero'
      });
      this.loading = false;
      return;
    }

    this.returnForm.patchValue({
      totalPrice: totalReturnPrice,
      netPrice: totalNetPrice,
      taxAmount: totalTaxAmount,
      discountAmount: totalDiscountAmount,
    });

    console.log(this.returnForm)

    if (this.returnForm.valid) {
      if (this.returnId) {
        const purchaseReturnVar = this.returnForm.value
        const purchaseReturnItems = purchaseReturnVar.purchaseReturnItems.map((x, i) => ({
          ...x,
          itemNo: String(i + 1)
        }))

        // Ensure all IDs are strings and dates are UTC strings
        const purchaseReturnData = {
          ...purchaseReturnVar,
          issueDate: purchaseReturnVar.issueDate ? formatDateToUTCString(purchaseReturnVar.issueDate) : null,
          dueDate: purchaseReturnVar.dueDate ? formatDateToUTCString(purchaseReturnVar.dueDate) : null,
          purchaseInvoiceId: String(purchaseReturnVar.purchaseInvoiceId),
          supplierDetailsId: String(purchaseReturnVar.supplierDetailsId),
          purchaseReturnItems: purchaseReturnItems.map(item => ({
            ...item,
            mainPurchaseClassId: String(item.mainPurchaseClassId),
            storeDetailsId: String(item.storeDetailsId)
          }))
        };

        console.log('Update data being sent:', purchaseReturnData);
        this.purchaseReturnService.updateReturn(this.returnId, purchaseReturnData).subscribe(
          () => {
            this.router.navigate(['/purchase-returns/list'])
            this.loading = false;

          },
          error => {
            console.error('Error during update:', error)
            this.loading = false;

          }
        );
        if (this.modalInstance) {
          this.modalInstance.hide();
        }
      } else {
        const purchaseReturnVar = this.returnForm.value
        const purchaseReturnItems = purchaseReturnVar.purchaseReturnItems.map((inv, i) => ({
          ...inv,
          itemNo: String(i + 1)
        }))
        
        // Ensure all IDs are strings and dates are UTC strings
        const purchaseReturnData = {
          ...purchaseReturnVar,
          issueDate: purchaseReturnVar.issueDate ? formatDateToUTCString(purchaseReturnVar.issueDate) : null,
          dueDate: purchaseReturnVar.dueDate ? formatDateToUTCString(purchaseReturnVar.dueDate) : null,
          purchaseInvoiceId: String(purchaseReturnVar.purchaseInvoiceId),
          supplierDetailsId: String(purchaseReturnVar.supplierDetailsId),
          purchaseReturnItems: purchaseReturnItems.map(item => ({
            ...item,
            mainPurchaseClassId: String(item.mainPurchaseClassId),
            storeDetailsId: String(item.storeDetailsId)
          }))
        };
        
        console.log('Form data being sent:', purchaseReturnData);
        console.log('Purchase return items:', purchaseReturnData.purchaseReturnItems);
        console.log('Purchase invoice ID:', purchaseReturnData.purchaseInvoiceId);
        
        this.purchaseReturnService.createReturn(purchaseReturnData).subscribe(
          () => {

            if (isSaveAndContinue) {
              this.loading = false;
              this.initiateForm();

              // Load 10 empty purchaseReturnItems with placeholder values
              for (let i = 0; i < 10; i++) {
                this.addItem({
                  id: null,
                  itemNo: '',
                  mainPurchaseClassId: null,
                  price: null,
                  quantity: null,
                  tax: 15,
                  taxAmount: 0,
                  discount: 0,
                  discountAmount: 0,
                  totalPrice: 0,
                  netPrice: 0,
                  purchaseReturnId: this.returnId,
                  storeDetailsId: '',
                });
              }
              this.cdr.detectChanges()

            }
            else {
              this.router.navigate(['/purchase-returns/list']);
              this.loading = false;
            }

          },
          error => {
            console.error('Error during creation:', error)
            this.loading = false;

          }
        );
      }
    }
    else {
      this.returnForm.markAllAsTouched();
      this.loading = false;

    }
  }

  //#region  load data


  loadData(): void {

    this.loading = true;
    forkJoin({
      stores: this.storeDetailsService.getAll(),
      suppliers: this.supplierService.getAll(),
      mainPurchase: this.purchaseClassService.getAll(),
      purchaseInvoices: this.purchaseInvoiceService.getAllInvoices()
    }).subscribe({
      next: ({ stores, suppliers, mainPurchase, purchaseInvoices }) => {
        this.stores = stores.filter(store => store.mainAccountId).map(store => ({
          label: this.activeLanguage === "en" ? store.englishName : store.arabicName,
          value: String(store?.id)
        }));
        this.suppliers = suppliers.filter(supplier => supplier.mainAccountId).map(supplier => ({
          label: this.activeLanguage === "en" ? supplier.englishName : supplier.arabicName,
          value: String(supplier.id)
        }));
        this.purchaseInvoices = purchaseInvoices.map(invoice => ({
          label: `${invoice.invoiceNo} - ${this.activeLanguage === "en" ? invoice.supplierDetails?.englishName : invoice.supplierDetails?.arabicName}`,
          value: String(invoice.id)
        }));
        this.mainPurchaseArray = mainPurchase;

        console.log('Stores:', this.stores);
        console.log('Suppliers:', this.suppliers);
        console.log('Main Purchase:', this.mainPurchaseArray);

        // Execute the method after all data is loaded
        this.initReturnForm()
      },
      error: (err) => {
        alert("ERROR")
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  async loadDefaultStoreDetails(event: DropdownChangeEvent): Promise<void> {
    if (event.value) {
      const storeDetailsId = event.value;
      
      for (let i = 0; i < this.purchaseReturnItems.length; i++) {
      const item = this.purchaseReturnItems.at(i);
        item.get('storeDetailsId')?.setValue(storeDetailsId);
      }
      
      await this.updateInventoryStocks(storeDetailsId);
    }
    this.cdr.detectChanges();
  }

  
  async onStoreChange(event: DropdownChangeEvent, index: number): Promise<void> {
    const storeDetailsId = event.value;
    
    this.returnForm.patchValue({ storeDetailsId: storeDetailsId });
    
    await this.updateInventoryStocks(storeDetailsId);
    
    const item = this.purchaseReturnItems.at(index);
    await this.updateAvailableQuantity(item, index);
    
    this.cdr.detectChanges();
  }

  toggleApplyTax(event: { checked: boolean }) {
    for (let i = this.purchaseReturnItems.length - 1; i >= 0; i--) {
      const item = this.purchaseReturnItems.at(i);
      item.get('tax').setValue(event.checked ? 15 : 0)
      this.updateItemValues(item as FormGroup)
    }
    this.updateReturnTotals()
  }

  getTaxAmount() {
    if (!this.taxApplied) return 0
    // calculate from items
    return Math.round(this.purchaseReturnItems.controls.reduce(
      (total, item) =>
        total + (this.taxApplied ? (item.get('price')?.value * item.get('quantity')?.value) * 0.15 : 0),
      0
    ) * 100) / 100
  }

  getNetPrice() {
    // calculate from items
    return Math.round(this.purchaseReturnItems.controls.reduce(
      (total, item) =>
        total + (item.get('price')?.value * item.get('quantity')?.value),
      0) * 100) / 100

  }

  getTotalPriceWithTax() {
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }

  getTotalQuantity(): number {
    let totalQuantity = 0;

    // Loop through each item in the form array
    this.purchaseReturnItems.controls.forEach(item => {
      const quantity = item.get('quantity')?.value || 0; // Get the quantity value, default to 0 if undefined
      totalQuantity += quantity; // Add to the total quantity
    });

    return totalQuantity;
  }

  getTotalPrice(): number {
    let totalPrice = 0;
    this.purchaseReturnItems.controls.forEach(item => {
      const price = item.get('price')?.value || 0;
      const quantity = item.get('quantity')?.value || 0;
      totalPrice += price * quantity; // Multiply price by quantity and add to totalPrice
    });
    return totalPrice;
  }


  confirmationCancelBeforeSavingChange() {

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('DATA.CANCEL_BEFORE_SAVING_CHANGE'),
      header: this.translate.instant('DATA.CANCEL_BEFORE_SAVING_CHANGE'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "btn btn-danger  rounded-md m-4",
      rejectButtonStyleClass: "btn btn-primary rounded-md  m-4",
      acceptLabel: this.translate.instant('DATA.YES'),
      rejectLabel: this.translate.instant('DATA.NO'),
      accept: () => {
        this.router.navigateByUrl('purchase-returns/list');
      }
    })
  }

  cancel() {
    this.confirmationCancelBeforeSavingChange();
   /*
    this.initiateForm();

    // Load 10 empty purchaseReturnItems with placeholder values
    for (let i = 0; i < 10; i++) {
      this.addItem({
        id: null,
        itemNo: '',
        mainPurchaseClassId: null,
        price: null,
        quantity: null,
        tax: 15,
        taxAmount: 0,
        discount: 0,
        discountAmount: 0,
        totalPrice: 0,
        netPrice: 0,
        purchaseReturnId: this.returnId,
        storeDetailsId: '',
      });
    }*/
  }
}
