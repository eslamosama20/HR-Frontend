import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { Observable, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { InvoiceNo } from 'src/app/models/invoice/invoiceNo';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';

import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { normalizeMainPurchaseItemType } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { PurchaseItem } from 'src/app/models/purchaseInvoice/purchaseItem';
import { TranslationService } from '../../../modules/i18n';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { formatDateToUTCString, getSystemNow } from '../../../utils/dateUtils';
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { BarcodeFailedEvent, BarcodeResolvedEvent } from '../../../_metronic/shared/barcode-input/barcode-input.component';
import { BarcodeService } from '../../../services/barcode/barcode.service';
import { SharedModule } from '../../../_metronic/shared/shared.module';

@Component({
  selector: 'app-purchase-invoice-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    TranslateModule,
    DropdownModule,
    InputSwitchModule,
    CalendarModule,
    BackButtonComponent,
    ConfirmDialogModule,
    MessagesModule,
    ButtonModule,
    ToastModule,
    SharedModule,
  ],
  providers: [ConfirmationService, MessageService],

  templateUrl: './purchase-invoice-form.component.html',
  styleUrls: ['./purchase-invoice-form.component.scss'],
})
export class PurchaseInvoiceFormComponent implements OnInit {
  taxAppliedSignal = signal<boolean>(true);
  get taxApplied() {
    return this.taxAppliedSignal();
  }
  copyId: number | null = null;

  set taxApplied(value: boolean) {
    this.taxAppliedSignal.set(value);
  }
  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }
  @ViewChild('invoiceModal') invoiceModal: ElementRef | undefined;
  @ViewChild('barcodeInputHost') barcodeInputHost: ElementRef | undefined;
  private modalInstance: Modal | undefined;

  invoiceForm: FormGroup;
  invoiceId: number;
  invoiceNo: InvoiceNo | null = null;
  isMinimized = false;
  isMaximized = false;
  storeId = null;
  isLoading: boolean = false;
  suppliers: any[] = [];
  mainPurchaseArray: any[] = [];
  stores: any[] = [];
  rawStoresList: any[] = [];
  isFormSubmitting: boolean = false;

  // Quick-add supplier state
  isNewSupplier: boolean = false;
  newSupplierName: string = '';
  newSupplierTaxNumber: string = '';
  isCreatingSupplier: boolean = false;

  translate: TranslateService;
  activeLanguage: string = 'en';

  isEditMode: boolean = false;
  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }
  constructor(
    private storeDetailsService: StoreDetailsService,
    private purchaseClassService: MainPurchaseClassService,
    private fb: FormBuilder,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private supplierService: SupplierDetailsService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private barcodeService: BarcodeService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');

    this.route.paramMap.subscribe((params) => {
      this.invoiceId = params.get('id')
        ? parseInt(params.get('id')!, 10)
        : null;

      if (this.invoiceId) this.isEditMode = true;

      console.log(this.isEditMode);
    });

    this.initiateForm();
  }

  initiateForm() {
    this.invoiceForm = this.fb.group({
      id: [this.invoiceId],
      invoiceNo: [],
      currency: ['SAR'],
      supplierDetailsId: ['', Validators.required],
      description: ['', Validators.required],
      issueDate: [getSystemNow()],
      dueDate: [getSystemNow()],
      tax: [0],
      taxAmount: [0],
      discountType: ['percentage'],
      discount: [0, [Validators.min(0)]],
      discountAmount: [0],
      totalPrice: [0],
      netPrice: [0],
      purchaseItems: this.fb.array([]),
      isFrontal: [this.isFrontal],
    });

    this.invoiceForm.get('issueDate')?.valueChanges.subscribe((newIssueDate) => {
      if (newIssueDate) {
        this.invoiceForm.get('dueDate')?.setValue(newIssueDate, { emitEvent: false });
      }
    });
  }

  //#region Modal
  toggleModalSize() {
    if (this.invoiceModal) {
      const modalElement =
        this.invoiceModal.nativeElement.querySelector('.modal-dialog'); // Target the modal dialog

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
    if (this.invoiceModal) {
      this.modalInstance = new Modal(this.invoiceModal.nativeElement);
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
    this.route.queryParamMap.subscribe((params) => {
      const cid = params.get('copyId');
      this.copyId = cid ? +cid : null;
    });

    if (!this.invoiceId) {
      this.generateInvoiceNum();
    }
    this.loadData();
    this.scheduleBarcodeInputFocus();
    // this.invoiceForm.get('discount')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateInvoiceTotals());
    // this.invoiceForm.get('discountType')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateInvoiceTotals());

    // this.purchaseItems.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateInvoiceTotals());
  }
  initInvoiceForm() {
    if (this.invoiceId) {
      // ===== وضع تعديل =====
      this.purchaseInvoiceService
        .getInvoiceById(this.invoiceId)
        .subscribe((invoice) => {
          this.invoiceForm.patchValue({
            ...invoice,
            issueDate: new Date(invoice.issueDate),
            dueDate: new Date(invoice.dueDate),
          });

          const hasTax = invoice.purchaseItems.every((item) => item.tax);
          if (!hasTax) {
            this.taxApplied = false;
            this.toggleApplyTax({ checked: false });
          } else {
            this.taxApplied = true;
            this.toggleApplyTax({ checked: true });
          }

          invoice.purchaseItems?.forEach((item) => this.addItem(item));
          this.cdr.detectChanges();
          this.updateInvoiceTotals();
        });
    } else {
      // ===== وضع إنشاء جديد =====
      if (this.copyId) {
        // ←← منطق النسخ: نجيب الأصل ونطبّق نسخة
        this.purchaseInvoiceService
          .getInvoiceById(this.copyId)
          .subscribe((original) => {
            this.applyCopyToForm(original);
          });
      } else {
        // Add 1 empty row for new invoice
        for (let i = 0; i < 1; i++) {
          this.addItem({
            id: null,
            itemNo: '',
            mainPurchaseClassId: null,
            price: null,
            quantity: null,
            tax: 15,
            taxAmount: null,
            discount: 0,
            discountAmount: null,
            totalPrice: null,
            netPrice: null,
            purchaseInvoiceId: this.invoiceId,
            storeDetailsId: '',
          });
        }
        this.cdr.detectChanges();
        this.updateInvoiceTotals();
      }
    }
  }
  private applyCopyToForm(source: any): void {
    // 1) الهيدر: خلّيها فاتورة جديدة بتاريخ اليوم ورقم جديد
    this.invoiceForm.patchValue({
      id: null,
      invoiceNo: null, // هنولّد رقم جديد
      currency: source.currency || 'SAR',
      supplierDetailsId: source.supplierDetailsId ?? null, // تقدر تغيّرها من الصفحة عادي
      description: source.description || '',
      issueDate: new Date(), // تاريخ اليوم
      dueDate: new Date(), // تاريخ اليوم
      tax: 0,
      taxAmount: 0,
      discountType: 'percentage',
      discount: 0,
      discountAmount: 0,
      totalPrice: 0,
      netPrice: 0,
      isFrontal: this.isFrontal,
    });

    // 2) امسح العناصر القديمة وخلي العداد يبدأ من 1
    this.purchaseItems.clear();
    this.itemCounter = 1;

    // 3) ابنِ العناصر المنسوخة بدون IDs وخلي الحسابات تتعمل من جديد
    (source.purchaseItems || []).forEach((it: any) => {
      this.addItem({
        id: null,
        itemNo: '', // بيتتحدد عند الحفظ
        mainPurchaseClassId:
          it.mainPurchaseClassId || it?.mainPurchaseClass?.id || null,
        price: it.price,
        quantity: it.quantity,
        discount: it.discount ?? 0,
        discountAmount: 0, // هنحسبه من جديد
        netPrice: 0, // هنحسبه من جديد
        tax: it.tax ?? 15,
        taxAmount: 0, // هنحسبه من جديد
        totalPrice: 0, // هنحسبه من جديد
        purchaseInvoiceId: null,
        storeDetailsId: it.storeDetailsId || it?.storeDetails?.id || null,
      } as PurchaseItem);
    });

    // 4) ضبط حالة الضريبة حسب البيانات الأصلية
    const allNoTax =
      (source.purchaseItems || []).length > 0
        ? (source.purchaseItems || []).every((i: any) => !i.tax || i.tax === 0)
        : false;
    this.taxApplied = !allNoTax;
    this.toggleApplyTax({ checked: this.taxApplied });

    // 5) رقم فاتورة جديد + تحديثات
    this.generateInvoiceNum();
    this.invoiceForm.markAsDirty();
    this.invoiceForm.updateValueAndValidity();
    this.cdr.detectChanges();
    this.updateInvoiceTotals();
  }

  onStoreClick(event: any, item: FormGroup) {
    const selectedStoreId = event.value;
    item.patchValue({ storeId: selectedStoreId });
  }

  private generateInvoiceNum() {
    this.purchaseInvoiceService.getInvoiceNumber().subscribe({
      next: (val) => {
        this.invoiceNo = val;
        this.invoiceForm.controls['invoiceNo'].setValue(
          this.invoiceNo?.invoiceNo
        );
      },
      error: (err) => {
        console.error('Error generating invoice number', err);
      },
    });
  }

  private filterValidItems(): any[] {
    return this.purchaseItems.controls
      .filter((item) => {
        const price = item.get('price')?.value;
        const itemNo = item.get('itemNo')?.value;

        return price && itemNo && price > 0 && itemNo !== 'string';
      })
      .map((item) => {
        this.updateItemValues(item as FormGroup);
        return item.value;
      });
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  normalizeControlDecimals(
    group: AbstractControl,
    controlName: string,
    fractionDigits: number
  ): void {
    const control = (group as FormGroup).get(controlName);
    if (!control) return;

    const rawValue = control.value;
    if (rawValue === null || rawValue === undefined || rawValue === '') return;

    const numericValue = parseFloat(rawValue);
    if (Number.isNaN(numericValue)) return;

    const factor = Math.pow(10, fractionDigits);
    control.setValue(Math.round(numericValue * factor) / factor);
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

    item.get('netPrice').setValue(this.roundToTwo(netPrice));
    item.get('discountAmount').setValue(this.roundToTwo(discountAmount));
    item
      .get('taxAmount')
      .setValue(this.roundToTwo(taxAmount));
    item.get('totalPrice').setValue(this.roundToTwo(totalPrice));
  }

  updateInvoiceTotals(): void {
    const filteredItems = this.filterValidItems();

    const totalInvoicePrice = filteredItems.reduce(
      (total, item) => total + (item.totalPrice || 0),
      0
    );
    const totalNetPrice = filteredItems.reduce(
      (total, item) => total + (item.netPrice || 0),
      0
    );
    const totalTaxAmount = filteredItems.reduce(
      (total, item) => total + (this.taxApplied ? item.taxAmount : 0),
      0
    );

    const discountType = this.invoiceForm.get('discountType')?.value;
    const invoiceDiscountValue =
      parseFloat(this.invoiceForm.get('discount')?.value) || 0;

    let invoiceDiscountAmount = 0;

    if (discountType === 'percentage') {
      invoiceDiscountAmount = (totalInvoicePrice * invoiceDiscountValue) / 100;
    } else if (discountType === 'amount') {
      invoiceDiscountAmount = invoiceDiscountValue;
    }

    const netPriceAfterDiscount = totalNetPrice - invoiceDiscountAmount;
    const totalPriceAfterDiscount =
      totalNetPrice + totalTaxAmount - invoiceDiscountAmount;

    this.invoiceForm
      .get('totalPrice')
      .patchValue(this.roundToTwo(totalPriceAfterDiscount), {
        emitEvent: false,
      });
    this.invoiceForm
      .get('netPrice')
      .patchValue(this.roundToTwo(netPriceAfterDiscount), {
        emitEvent: false,
      });
    this.invoiceForm
      .get('taxAmount')
      .patchValue(this.roundToTwo(totalTaxAmount), { emitEvent: false });
    this.invoiceForm
      .get('discountAmount')
      .patchValue(this.roundToTwo(invoiceDiscountAmount), {
        emitEvent: false,
      });

    // Detect changes only if necessary
    try {
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error during change detection:', error);
    }
  }

  onDiscountTypeChange(event: any): void {
    const discountType = event.target.value;
    this.invoiceForm.patchValue({ discount: 0 });

    this.updateInvoiceTotals();
  }

  get purchaseItems(): FormArray {
    return this.invoiceForm.get('purchaseItems') as FormArray;
  }
  private itemCounter = 1;

  addItem(purchaseItem: PurchaseItem = null): void {
    const itemNo = `${this.itemCounter}`;
    this.itemCounter++;

    // Safely retrieve the measurement unit
    let unit = '';
    if (purchaseItem?.mainPurchaseClassId) {
      const mainPurchaseClass = this.mainPurchaseArray.find(
        (m) => m.id == purchaseItem.mainPurchaseClassId
      );
      unit = mainPurchaseClass
        ? mainPurchaseClass.measurementUnit.arabicSymbol
        : '';
    }

    const itemFormGroup = this.fb.group({
      id: [purchaseItem?.id ?? null],
      itemNo: [{ value: itemNo, disabled: true }], // Set itemNo as a disabled field if it's auto-generated
      mainPurchaseClassId: [purchaseItem?.mainPurchaseClassId, Validators.required],
      price: [purchaseItem?.price, [Validators.required, Validators.min(0.01)]],
      quantity: [
        purchaseItem?.quantity ?? null,
        [Validators.required, Validators.min(0.01)],
      ],
      batchNo: [purchaseItem?.batchNo ?? null],
      expiryDate: [this.normalizeExpiryDateForForm(purchaseItem?.expiryDate) ?? null],
      discount: [purchaseItem?.discount ?? 0, [Validators.min(0)]],
      discountAmount: [purchaseItem?.discountAmount ?? null],
      netPrice: [purchaseItem?.netPrice ?? null],
      tax: [purchaseItem?.tax ?? 15],
      taxAmount: [purchaseItem?.taxAmount ?? null],
      totalPrice: [purchaseItem?.totalPrice ?? null],
      purchaseInvoiceId: [this.invoiceId],
      storeDetailsId: [purchaseItem?.storeDetailsId, Validators.required],
      unit: [unit], // Use the safe unit value here
      retailPrice: [purchaseItem?.retailPrice || null],
      wholesalePrice: [purchaseItem?.wholesalePrice || null],
      bulkPrice: [purchaseItem?.bulkPrice || null],
    });

    console.log(this.purchaseItems.controls);

    this.purchaseItems.push(itemFormGroup);

    // Apply tracking validators based on selected item (source of truth: item master)
    this.applyTrackingRulesForRow(itemFormGroup, itemFormGroup.get('mainPurchaseClassId')?.value, { resetStale: false });

    // Recompute tracking rules on item change
    itemFormGroup.get('mainPurchaseClassId')?.valueChanges.subscribe((id) => {
      this.applyTrackingRulesForRow(itemFormGroup, id, { resetStale: true });
    });

    itemFormGroup
      .get('price')
      ?.valueChanges.subscribe(() => this.updateInvoiceTotals());
    itemFormGroup
      .get('quantity')
      ?.valueChanges.subscribe(() => this.updateInvoiceTotals());
    itemFormGroup
      .get('discount')
      ?.valueChanges.subscribe(() => this.updateInvoiceTotals());

    // Add debounce to avoid frequent calculations
    itemFormGroup
      .get('price')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.updateInvoiceTotals());

    this.updateInvoiceTotals();
  }

  removeItem(index: number): void {
    this.purchaseItems.removeAt(index);
    this.updateInvoiceTotals();
    this.cdr.detectChanges();
  }

  setSupplierIdForInvoice(supplierIdValue: string): void {
    this.invoiceForm.get('supplierDetailsId')?.setValue(supplierIdValue);
  }

  toggleNewSupplier(): void {
    this.isNewSupplier = true;
    this.invoiceForm.get('supplierDetailsId')?.setValue(null);
  }

  cancelNewSupplier(): void {
    this.isNewSupplier = false;
    this.newSupplierName = '';
    this.newSupplierTaxNumber = '';
  }

  onPurchaseClick(event: any, item: AbstractControl<any, any>) {
    const purchaseId = event.value;

    const purchaseObject = this.mainPurchaseArray.find(
      (x) => x.id === purchaseId
    );

    item.get('unit')?.setValue(purchaseObject?.measurementUnit?.arabicSymbol);
    this.applyTrackingRulesForRow(item as FormGroup, purchaseId, { resetStale: true });
    this.cdr.detectChanges();
  }

  purchaseBarcodeScanHandler = (barcode: string): Observable<unknown> => {
    return this.barcodeService.getPurchaseProductByBarcode(barcode);
  };

  onPurchaseBarcodeResolved(event: BarcodeResolvedEvent): void {
    const product = event.result as {
      id?: string;
      arabicName?: string;
      englishName?: string;
      measurementUnitName?: string;
    };

    if (!product?.id) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('INVOICE.BARCODE_PRODUCT_INCOMPLETE')
      });
      return;
    }

    const existingItem = this.findExistingPurchaseItemByProductId(product.id);
    if (existingItem) {
      const currentQuantity = parseFloat(existingItem.get('quantity')?.value) || 0;
      existingItem.get('quantity')?.setValue(currentQuantity + 1);
      this.updateItemValues(existingItem);
      this.updateInvoiceTotals();
      return;
    }

    this.addItem({
      id: null,
      itemNo: '',
      mainPurchaseClassId: product.id as any,
      price: null,
      quantity: 1,
      tax: this.taxApplied ? 15 : 0,
      taxAmount: 0,
      discount: 0,
      discountAmount: 0,
      totalPrice: 0,
      netPrice: 0,
      purchaseInvoiceId: this.invoiceId,
      storeDetailsId: this.storeId || '',
    } as PurchaseItem);

    const addedItem = this.purchaseItems.at(this.purchaseItems.length - 1) as FormGroup;
    const selectedProduct = this.mainPurchaseArray.find((x) => x.id === product.id);
    addedItem.get('unit')?.setValue(
      selectedProduct?.measurementUnit?.arabicSymbol ||
      selectedProduct?.measurementUnit?.englishSymbol ||
      product.measurementUnitName ||
      ''
    );
    this.updateItemValues(addedItem);
    this.updateInvoiceTotals();
  }

  onPurchaseBarcodeFailed(event: BarcodeFailedEvent): void {
    const currentLanguage = this.translate.currentLang || this.activeLanguage;
    const detailMessage = this.barcodeService.getLocalizedBarcodeErrorMessage(
      event?.error,
      currentLanguage,
      this.translate.instant('INVOICE.BARCODE_NOT_FOUND')
    );

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('FINANCE.ERROR'),
      detail: detailMessage
    });
  }

  submitForm(event: Event, isSaveAndContinue): void {
    // Start loading states at the beginning of the form submission
    this.loading = true;

    // If new supplier quick-add mode, create the supplier first
    if (this.isNewSupplier) {
      if (!this.newSupplierName || this.newSupplierName.trim() === '') {
        this.loading = false;
        return;
      }
      this.isCreatingSupplier = true;
      this.supplierService.quickAdd({
        arabicName: this.newSupplierName.trim(),
        taxNumber: this.newSupplierTaxNumber?.trim() || undefined,
      }).subscribe({
        next: (supplier) => {
          this.isCreatingSupplier = false;
          // Add to local list
          this.suppliers.push({
            label: this.activeLanguage === 'en' ? (supplier.englishName || supplier.arabicName) : supplier.arabicName,
            value: supplier.id,
          });
          // Patch the form with the new supplier id
          this.invoiceForm.get('supplierDetailsId')?.setValue(supplier.id);
          // Reset quick-add state
          this.isNewSupplier = false;
          this.newSupplierName = '';
          this.newSupplierTaxNumber = '';
          // Continue with invoice save
          this.continueSubmitForm(isSaveAndContinue);
        },
        error: (err) => {
          this.isCreatingSupplier = false;
          this.loading = false;
        },
      });
      return;
    }

    this.continueSubmitForm(isSaveAndContinue);
  }

  continueSubmitForm(isSaveAndContinue): void {
    this.invoiceForm.markAllAsTouched();
    this.purchaseItems.controls.forEach((item) => {
      item.markAllAsTouched();
    });

    const hasInvalidItems = this.purchaseItems.controls.some((item) => {
      const priceVal = item.get('price')?.value;
      const quantityVal = item.get('quantity')?.value;
      const mainPurchaseClassIdVal = item.get('mainPurchaseClassId')?.value;
      const storeDetailsIdVal = item.get('storeDetailsId')?.value;
      const batchNoVal = item.get('batchNo')?.value;
      const expiryDateVal = item.get('expiryDate')?.value;
      // Skip totally empty rows — they will be removed before save
      const isCompletelyEmpty = !priceVal && !quantityVal && !mainPurchaseClassIdVal && !storeDetailsIdVal;
      if (isCompletelyEmpty) return false;

      // Tracked-item validation (conditional, per-row)
      if (this.isBatchRequiredForRow(item as FormGroup) && (!batchNoVal || `${batchNoVal}`.trim() === '')) {
        return true;
      }
      if (this.isExpiryRequiredForRow(item as FormGroup) && !expiryDateVal) {
        return true;
      }

      // Only flag partially-filled rows that are still invalid
      return !priceVal || !quantityVal || !mainPurchaseClassIdVal || !storeDetailsIdVal || priceVal <= 0 || quantityVal <= 0;
    });

    if (hasInvalidItems) {
      this.loading = false;
      return;
    }

    const hasValidItems = this.purchaseItems.controls.some((item) => {
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
      const storeDetailsId = item.get('storeDetailsId')?.value;
      return price && quantity && mainPurchaseClassId && storeDetailsId && price > 0 && quantity > 0;
    });

    if (!hasValidItems) {
      this.loading = false;
      return;
    }

    for (let i = this.purchaseItems.length - 1; i >= 0; i--) {
      const item = this.purchaseItems.at(i);

      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
      const storeDetailsId = item.get('storeDetailsId')?.value;

      if (!price || !quantity || !mainPurchaseClassId || !storeDetailsId || price <= 0 || quantity <= 0) {
        this.purchaseItems.removeAt(i);
      }
    }

    // Calculate totals
    const totalInvoicePrice = this.purchaseItems.controls.reduce(
      (total, item) => total + (item.get('totalPrice')?.value || 0),
      0
    );
    const totalNetPrice = this.purchaseItems.controls.reduce(
      (total, item) => total + (item.get('netPrice')?.value || 0),
      0
    );
    const totalTaxAmount = this.purchaseItems.controls.reduce(
      (total, item) =>
        total + (this.taxApplied ? item.get('taxAmount')?.value : 0),
      0
    );

    // Update invoice form with calculated totals
    this.invoiceForm.patchValue({
      totalPrice: totalInvoicePrice,
      netPrice: totalNetPrice,
      taxAmount: totalTaxAmount,
      discountAmount:
        this.invoiceForm.get('discountType').value == 'amount'
          ? this.invoiceForm.get('discount').value
          : (this.invoiceForm.get('discount').value / 100) * totalNetPrice,
    });
    if (this.invoiceForm.valid) {
      const invs = this.invoiceForm.value;
      const purchaseItems = invs.purchaseItems.map((inv, i) => {
        const req = this.getTrackingRequirementsByProductId(inv?.mainPurchaseClassId);
        return {
          ...inv,
          itemNo: String(i + 1),
          batchNo: req.needsBatch && inv?.batchNo ? String(inv.batchNo).trim() : null,
          expiryDate: req.needsExpiry && inv?.expiryDate ? formatDateToUTCString(inv.expiryDate) : null,
        };
      });

      // Determine if we are adding or updating the invoice
      if (this.invoiceId) {
        // Update Invoice
        this.purchaseInvoiceService
          .updateInvoice(this.invoiceId, {
            ...invs,
            purchaseItems,
            dueDate: formatDateToUTCString(invs.dueDate),
            issueDate: formatDateToUTCString(invs.issueDate),
          })
          .subscribe(
            () => {
              this.loading = false;

              if (isSaveAndContinue) {
                // Only clear form for new invoices, not when editing
                if (!this.isEditMode) {
                  this.initiateForm();
                  this.generateInvoiceNum(); // Generate new invoice number
                  // Add 1 empty row for new invoice
                  for (let i = 0; i < 1; i++) {
                    this.addItem({
                      id: null,
                      itemNo: '',
                      mainPurchaseClassId: null,
                      price: null,
                      quantity: null,
                      tax: 15,
                      taxAmount: null,
                      discount: 0,
                      discountAmount: null,
                      totalPrice: null,
                      netPrice: null,
                      purchaseInvoiceId: null, // Reset to null for new invoice
                      storeDetailsId: '',
                    });
                  }
                  this.cdr.detectChanges();
                } else {
                  // If editing, just navigate to list
                  if (this.isFrontal) {
                    this.router.navigate(['/purchase-invoices/frontal-list']);
                  } else {
                    this.router.navigate(['/purchase-invoices/list']);
                  }
                }
              } else {
                if (this.isFrontal) {
                  this.router.navigate(['/purchase-invoices/frontal-list']);
                } else {
                  this.router.navigate(['/purchase-invoices/list']);
                }
              }
              // Reset loading states on success
            },
            (error) => {
              console.error('Error during update:', error);
              this.isFormSubmitting = false; // Stop form submitting
              // Reset loading states on error
              this.loading = false;
            },
            () => {
              this.isLoading = false; // Stop loading when done
              this.loading = false;
            }
          );
        if (this.modalInstance) {
          this.modalInstance.hide();
        }
      } else {
        invs.isFrontal = this.isFrontal;
        // Create Invoice
        this.purchaseInvoiceService
          .createInvoice({
            ...invs,
            purchaseItems,
            dueDate: formatDateToUTCString(invs.dueDate),
            issueDate: formatDateToUTCString(invs.issueDate),
          })
          .subscribe(
            () => {
              if (isSaveAndContinue) {
                // Clear form and stay on the same page for new invoice
                this.initiateForm();
                this.generateInvoiceNum(); // Generate new invoice number
                // Add 1 empty row for new invoice
                for (let i = 0; i < 1; i++) {
                  this.addItem({
                    id: null,
                    itemNo: '',
                    mainPurchaseClassId: null,
                    price: null,
                    quantity: null,
                    tax: 15,
                    taxAmount: null,
                    discount: 0,
                    discountAmount: null,
                    totalPrice: null,
                    netPrice: null,
                    purchaseInvoiceId: null, // Reset to null for new invoice
                    storeDetailsId: '',
                  });
                }
                this.cdr.detectChanges();
              } else {
                // Navigate to list only if not save and continue
                if (this.isFrontal) {
                  this.router.navigate(['/purchase-invoices/frontal-list']);
                } else {
                  this.router.navigate(['/purchase-invoices/list']);
                }
              }
              this.loading = false;
            },
            (error) => {
              console.error('Error during creation:', error);
              this.isFormSubmitting = false; // Stop form submitting
              this.loading = false;
            },
            () => {
              this.isLoading = false; // Stop loading when done
              this.loading = false;
            }
          );
      }
    } else {
      this.invoiceForm.markAllAsTouched();
      this.isLoading = false;
      this.loading = false;
    }
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      stores: this.storeDetailsService.getAll(),
      suppliers: this.supplierService.getAll(),
      mainPurchase: this.purchaseClassService.getAll(),
    }).subscribe({
      next: ({ stores, suppliers, mainPurchase }) => {
        this.rawStoresList = stores;
        this.stores = stores
          .filter((store) => store.mainAccountId)
          .map((store) => ({
            label:
              this.activeLanguage === 'en'
                ? store.englishName
                : store.arabicName,
            value: store?.id,
          }));
        this.suppliers = suppliers
          .filter((supplier) => supplier.mainAccountId)
          .map((supplier) => ({
            label:
              this.activeLanguage === 'en'
                ? supplier.englishName
                : supplier.arabicName,
            value: supplier.id,
          }));
        this.mainPurchaseArray = mainPurchase;

        console.log('Stores:', this.stores);
        console.log('Suppliers:', this.suppliers);
        console.log('Main Purchase:', this.mainPurchaseArray);

        // Execute the method after all data is loaded
        this.initInvoiceForm();
        this.scheduleBarcodeInputFocus();
      },
      error: (err) => {
        alert('ERROR');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  getFilteredProducts(storeDetailsId: string | null | undefined): any[] {
    const targetStoreId = storeDetailsId || this.storeId;
    if (!targetStoreId) {
      return this.mainPurchaseArray;
    }
    const store = this.rawStoresList.find(s => s.id === targetStoreId);
    if (!store) {
      return this.mainPurchaseArray;
    }

    const storeCategory = (store.storeCategory ?? store.storeType ?? '').toLowerCase();
    const isPharmacy = storeCategory === 'pharmacy';

    return this.mainPurchaseArray.filter(p => {
      const isMedication = p.isPharmacyItem === true || normalizeMainPurchaseItemType(p.itemType) === 'medication';
      return isPharmacy ? isMedication : !isMedication;
    });
  }

  confirmationCancelBeforeSavingChange() {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('DATA.CANCEL_BEFORE_SAVING_CHANGE'),
      header: this.translate.instant('DATA.CANCEL_BEFORE_SAVING_CHANGE'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'btn btn-primary rounded-md m-4',
      rejectButtonStyleClass: 'btn btn-danger rounded-md m-4',
      acceptLabel: this.translate.instant('DATA.YES'),
      rejectLabel: this.translate.instant('DATA.NO'),
      accept: () => {
        if (this.isFrontal) {
          this.router.navigate(['/purchase-invoices/frontal-list']);
        } else {
          this.router.navigate(['/purchase-invoices/list']);
        }
      },
    });
  }

  cancel() {
    /*this.initiateForm();

    const itemsToAdd = 10; // Number of items to add

    for (let i = 0; i < itemsToAdd; i++) {
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
        purchaseInvoiceId: this.invoiceId,
        storeDetailsId: '',
      });
    }*/

    this.confirmationCancelBeforeSavingChange();
  }

  loadDefaultStoreDetails(event: DropdownChangeEvent) {
    this.storeId = event.value;
    for (let i = this.purchaseItems.length - 1; i >= 0; i--) {
      const item = this.purchaseItems.at(i);
      this.purchaseItems
        .at(i)
        .patchValue({ ...item.value, storeDetailsId: event.value });
    }
  }

  //#endregion
  toggleApplyTax(event: { checked: boolean }) {
    for (let i = this.purchaseItems.length - 1; i >= 0; i--) {
      const item = this.purchaseItems.at(i);
      item.get('tax').setValue(event.checked ? 15 : 0);
      this.updateItemValues(item as FormGroup);
    }
    this.updateInvoiceTotals();
  }

  private hasAnyValidItems(): boolean {
    return this.purchaseItems.controls.some((item) => {
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      return price && quantity && price > 0 && quantity > 0;
    });
  }

  getTaxAmount() {
    if (!this.hasAnyValidItems()) return null;
    if (!this.taxApplied) return 0;
    // calculate from items
    return (
      Math.round(
        this.purchaseItems.controls.reduce(
          (total, item) =>
            total +
            (this.taxApplied
              ? item.get('price')?.value * item.get('quantity')?.value * 0.15
              : 0),
          0
        ) * 100
      ) / 100
    );
  }

  getNetPrice() {
    if (!this.hasAnyValidItems()) return null;
    // calculate from items
    return (
      Math.round(
        this.purchaseItems.controls.reduce(
          (total, item) =>
            total + item.get('price')?.value * item.get('quantity')?.value,
          0
        ) * 100
      ) / 100
    );
  }

  getTotalPrice() {
    if (!this.hasAnyValidItems()) return null;
    // calculate from items
    return this.roundToTwo((this.getNetPrice() || 0) + (this.getTaxAmount() || 0));
  }

  private findExistingPurchaseItemByProductId(productId: string): FormGroup | null {
    for (const control of this.purchaseItems.controls) {
      const item = control as FormGroup;
      if (item.get('mainPurchaseClassId')?.value === productId) {
        return item;
      }
    }
    return null;
  }

  private scheduleBarcodeInputFocus(): void {
    setTimeout(() => {
      const inputElement = this.barcodeInputHost?.nativeElement?.querySelector('input');
      inputElement?.focus();
    }, 150);
  }

  // =========================
  // Tracked item helpers (batch/expiry) - source of truth: MainPurchaseClass
  // =========================
  private getMainPurchaseById(id: any): any | null {
    if (!id) return null;
    return this.mainPurchaseArray?.find((x) => x.id === id) ?? null;
  }

  private normalizeExpiryDateForForm(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private getTrackingRequirementsByProductId(id: any): { needsBatch: boolean; needsExpiry: boolean } {
    const p = this.getMainPurchaseById(id);
    const itemType = normalizeMainPurchaseItemType(p?.itemType);
    const needsBatch = !!p?.needsBatch || itemType === 'medication';
    const needsExpiry = !!p?.needsExpiry || itemType === 'medication';
    return { needsBatch, needsExpiry };
  }

  requiresTrackingForRow(row: AbstractControl): boolean {
    const id = row?.get('mainPurchaseClassId')?.value;
    const req = this.getTrackingRequirementsByProductId(id);
    return req.needsBatch || req.needsExpiry;
  }

  isBatchRequiredForRow(row: AbstractControl): boolean {
    const id = row?.get('mainPurchaseClassId')?.value;
    return this.getTrackingRequirementsByProductId(id).needsBatch;
  }

  isExpiryRequiredForRow(row: AbstractControl): boolean {
    const id = row?.get('mainPurchaseClassId')?.value;
    return this.getTrackingRequirementsByProductId(id).needsExpiry;
  }

  private applyTrackingRulesForRow(
    row: FormGroup,
    productId: any,
    opts: { resetStale: boolean }
  ): void {
    const { needsBatch, needsExpiry } = this.getTrackingRequirementsByProductId(productId);

    const batchCtrl = row.get('batchNo');
    const expiryCtrl = row.get('expiryDate');

    if (needsBatch) {
      batchCtrl?.setValidators([Validators.required]);
    } else {
      batchCtrl?.clearValidators();
      if (opts.resetStale) batchCtrl?.setValue(null, { emitEvent: false });
    }
    batchCtrl?.updateValueAndValidity({ emitEvent: false });

    if (needsExpiry) {
      expiryCtrl?.setValidators([Validators.required]);
    } else {
      expiryCtrl?.clearValidators();
      if (opts.resetStale) expiryCtrl?.setValue(null, { emitEvent: false });
    }
    expiryCtrl?.updateValueAndValidity({ emitEvent: false });
  }
}
