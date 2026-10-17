import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import {Router, ActivatedRoute, RouterLink} from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';

import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { SalesCreditNotesService } from 'src/app/services/notes/sales-credit-notes.service';
import { SalesCreditNoteItemModel } from 'src/app/models/notes/salesCreditNoteItem.model';
import { SalesCreditNoteModel } from 'src/app/models/notes/salesCreditNote.model';
import { TranslationService } from "../../../../modules/i18n";
import { debounceTime, distinctUntilChanged, forkJoin } from "rxjs";
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from "primeng/calendar";
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { MessagesModule } from 'primeng/messages';
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {FormatDecimalPipe} from "../../../../pipes/format-decimal.pipe";
import {SalesInvoiceService} from "../../../../services/salesInvoice/sales-invoice.service";
import {formatDateToUTCString, getSystemNow} from "../../../../utils/dateUtils";
import {BackButtonComponent} from "../../../../shared-components/back-button/back-button.component";
import {ToastModule} from "primeng/toast";

@Component({
  selector: 'app-sales-credit-note-form',
  standalone: true,
  imports: [
    FormatDecimalPipe,
    ReactiveFormsModule, FormsModule, CommonModule, TranslateModule, DropdownModule, InputNumberModule, CalendarModule, ConfirmDialogModule, MessagesModule, ButtonModule, AutoCompleteModule, RouterLink, BackButtonComponent, ToastModule],
    providers: [ConfirmationService, MessageService],

  templateUrl: './sales-credit-note-form.component.html',
  styleUrls: ['./sales-credit-note-form.component.scss']
})
export class SalesCreditNoteFormComponent implements OnInit {
  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal()
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value)
  }
  @ViewChild('salesCreditNoteModal') salesCreditNoteModal: ElementRef | undefined;
  private modalInstance: Modal | undefined;

  salesCreditNoteForm: FormGroup;
  invoiceId: number = null;
  salesCreditNoteId: string = null;
  mainSalesArray: any[] = [];

  translate: TranslateService;
  activeLanguage: string = "en";
  isEditMode: boolean = false;
  constructor(
    private salesClassService: MainSalesClassService,
    private fb: FormBuilder,
    private salesCreditNoteService: SalesCreditNotesService,
    private invoiceService: SalesInvoiceService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private customerService: CustomerProfileService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService

  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();





  }


  currentInvoiceSignal = signal<any>(null)
  get currentInvoice() {
    return this.currentInvoiceSignal();
  }
  set currentInvoice(value) {
    this.currentInvoiceSignal.set(value);
  }
  currentSalesCreditNoteSignal = signal<any>(null)
  get currentSalesCreditNote() {
    return this.currentSalesCreditNoteSignal();
  }
  set currentSalesCreditNote(value) {
    this.currentSalesCreditNoteSignal.set(value);
  }


  ngOnInit(): void {
    this.initForm()

    this.loadMode()
    this.loadData()
  }
  loadMode() {
    this.salesCreditNoteId = this.route.snapshot.paramMap.get('id');
    this.invoiceId = parseInt(this.route.snapshot.queryParamMap.get('invoiceId')!, 10);
    if (this.salesCreditNoteId)
    {
      this.loadSalesCreditNote(this.salesCreditNoteId);
      this.isEditMode = true;
    }
    else if (this.invoiceId)
    {
      this.loadInvoice(this.invoiceId);
      this.isEditMode = false;
    }
  }
  initForm() {
    this.salesCreditNoteForm = this.fb.group({
      id: [this.salesCreditNoteId],
      adjustmentReason: ['', Validators.required],
      saleInvoiceId: [this.invoiceId, Validators.required],
      description: [''],
      issueDate: [getSystemNow()],
      dueDate: [getSystemNow()],
      salesCreditNoteNo: [],
      discountAmount: [0, [Validators.min(0)]],
      customerProfileId: ['', Validators.required],
      customerProfileName: [''],
      transactionId: [''],
      salesCreditNoteItems: this.fb.array([]),
    });
  }
  loadSalesCreditNote(salesCreditNoteId:string) {
    this.salesCreditNoteService.getById(salesCreditNoteId).subscribe((salesCreditNote) => {
      this.currentSalesCreditNote = salesCreditNote;
      this.initFormFromSalesCreditNote();
      this.invoiceId = salesCreditNote.saleInvoiceId;
      this.loadInvoice(this.invoiceId, false);
      this.cdr.detectChanges();
    });
  }
  loadInvoice(invoiceId:number, isInit:boolean = true) {
      this.invoiceService.getInvoiceById(invoiceId).subscribe((invoice) => {
        this.currentInvoice = invoice;
        if (isInit){
          this.initFormFromInvoice();
        }
        this.cdr.detectChanges();

      });
  }
  initFormFromSalesCreditNote() {
    if (!this.currentSalesCreditNote)
      return;
    const salesCreditNote = this.currentSalesCreditNote;
    this.salesCreditNoteForm.patchValue({
      ...salesCreditNote,
      issueDate: new Date(salesCreditNote.issueDate),
      dueDate: new Date(salesCreditNote.dueDate),
      customerProfileName: this.activeLanguage == "en" ? salesCreditNote.customerProfile.englishName : salesCreditNote.customerProfile.arabicName,
    });
    salesCreditNote.salesCreditNoteItems?.forEach(item => {
      console.log(item)
      this.addItem(item)
    });
    this.cdr.detectChanges();
  }
  initFormFromInvoice() {
    console.log(this.currentInvoice)
    if (!this.currentInvoice)
      return;
    const invoice = this.currentInvoice;
    this.salesCreditNoteForm.patchValue({
      ...invoice,
      issueDate: new Date(invoice.issueDate),
      dueDate: new Date(invoice.dueDate),
      customerProfileName: this.activeLanguage == "en" ? invoice.customerProfile.englishName : invoice.customerProfile.arabicName,
      saleInvoiceId: invoice.id,
      transactionId: null,
    });
    invoice.saleItems?.forEach(item => {
      console.log(item)
      const newSalesCreditNoteItem = new SalesCreditNoteItemModel({
        mainSalesClassId: item.mainSalesClass.id,
        mainSalesClass: item.mainSalesClass,
        quantity: item.quantity,
        noOfNights: item.noOfNights,
        price: item.price,
        salesCreditNoteId: this.salesCreditNoteId,
        itemNo: String(item.id),
      })
      this.addItem(newSalesCreditNoteItem)
    });
    this.cdr.detectChanges();
  }








  get salesCreditNoteItems(): FormArray {
    return this.salesCreditNoteForm.get('salesCreditNoteItems') as FormArray;
  }


  private itemCounter = 1;

  addItem(item: any = null): void {
    const itemFormGroup = this.fb.group({
      id: [item?.id ?? null],
      mainSalesClassId: [item?.mainSalesClassId],
      price: [item?.price, [Validators.required, Validators.min(0)]],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.0001)]],
      itemNo: [String(item?.itemNo ?? null)],
      noOfNights: [
        item?.noOfNights ?? 1,
        [Validators.required, Validators.min(1), Validators.pattern('^[0-9]*$')],
      ],
      saleSalesCreditNoteId: [this.salesCreditNoteId],
      unit: item?.mainSalesClassId
        ? this.activeLanguage === 'en'
          ? item.mainSalesClass.measurementUnit.englishSymbol
          : item.mainSalesClass.measurementUnit.arabicSymbol
        : '',
    });

    // Add the form group to the form array
    this.salesCreditNoteItems.push(itemFormGroup);

  }




  removeItem(index: number): void {
    this.salesCreditNoteItems.removeAt(index);
    this.cdr.detectChanges();
  }


  onSalesClick(event: any, item: AbstractControl<any, any>) {
    const salesId = event.value

    const salesObject = this.mainSalesArray.find(x => x.id === salesId);

    item.get('unit')?.setValue(salesObject?.measurementUnit?.arabicSymbol);
    this.cdr.detectChanges()
  }
  getInvoiceTaxAmount(invoice) {
    // If there was explicitly no tax to collect, bail early
    if (invoice.taxAmount === 0) return 0;

    // 1) Compute each item's raw subtotal and the grand total
    const subtotals = invoice.saleItems.map(item =>
      item.price * item.quantity * item.noOfNights
    );
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);

    // 2) Pull in the discount
    const discount = invoice.discountAmount || 0;

    // 3) For each item: compute its share of discount, then its tax
    let totalTax = 0;
    invoice.saleItems.forEach((item, idx) => {
      const itemSubtotal = subtotals[idx];

      // Determine tax rate based on mainSalesClass
      const isExempt = item.mainSalesClass?.isTaxExempted;
      const taxRate = isExempt ? 0 : 0.15;

      // Allocate discount proportionally
      const itemDiscount = grossTotal > 0
        ? (itemSubtotal / grossTotal) * discount
        : 0;

      // Taxable base = remaining after discount
      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);

      totalTax += taxableBase * taxRate;
    });

    // 4) Round and return
    return Math.round(totalTax * 100) / 100;
  }


  getInvoiceNetPrice(invoice) {
    // calculate from items
    const netTotal = invoice.saleItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity * item.noOfNights),
      0
    );
    const discount = invoice.discountAmount || 0;
    const discountedTotal = netTotal - discount;
    return Math.round(discountedTotal * 100) / 100;
  }

  getInvoiceTotalPrice(invoice) {
    // calculate from items
    return Math.round(this.getInvoiceNetPrice(invoice) *100) / 100 + Math.round(this.getInvoiceTaxAmount(invoice) *100) / 100
  }

  submitForm(event: Event): void {
    this.loading = true;

    for (let i = this.salesCreditNoteItems.length - 1; i >= 0; i--) {
      const item = this.salesCreditNoteItems.at(i);

      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const noOfNights = item.get('noOfNights')?.value;

      if (!price || !quantity || !noOfNights || price <= 0 || quantity <= 0 || noOfNights < 1) {
        this.salesCreditNoteItems.removeAt(i);
      }
    }




    const invs = this.salesCreditNoteForm.value
  // get saleItems from the current invoice , and check if in the salesCreditNoteItems there is a match of the mainSalesClassId that has quantity larger
    const saleItems = this.currentInvoice.saleItems
    const salesCreditNoteItems = invs.salesCreditNoteItems
    const errors = []
    salesCreditNoteItems.forEach(item => {
      const saleItem = saleItems.find(x => x.mainSalesClassId == item.mainSalesClassId)
      if (saleItem.quantity < item.quantity){
        errors.push(` صنف ${saleItem.mainSalesClass.arabicName} لا يمكن ان يكون بكمية اكبر من الفاتورة`)
      }
    })

    const salesCreditNoteTotalPrice = this.getTotalPrice();
    const invoiceTotalPrice = this.getInvoiceTotalPrice(this.currentInvoice);
    if (salesCreditNoteTotalPrice > invoiceTotalPrice){
      errors.push(` المبلغ الإجمالي للإشعار يجب أن يكون أقل من المبلغ الإجمالي للفاتورة`)
    }
    if (errors.length > 0){
      alert(errors.join('\n'))
      this.loading = false;
      return
    }

    if (this.salesCreditNoteForm.valid) {
      if (this.salesCreditNoteId) {
        const salesCreditNoteItems = invs.salesCreditNoteItems.map((inv, i) => ({
          ...inv,
        }))
        console.log(invs)
        const salesCreditNoteToUpdate = new SalesCreditNoteModel();
        salesCreditNoteToUpdate.id = this.salesCreditNoteId;
        salesCreditNoteToUpdate.salesCreditNoteNo = invs.salesCreditNoteNo;
        salesCreditNoteToUpdate.saleInvoiceId = invs.saleInvoiceId;
        salesCreditNoteToUpdate.adjustmentReason = invs.adjustmentReason;
        salesCreditNoteToUpdate.customerProfileId = invs.customerProfileId;
        salesCreditNoteToUpdate.description = invs.description;
        salesCreditNoteToUpdate.issueDate = formatDateToUTCString(invs.issueDate);
        salesCreditNoteToUpdate.dueDate =  formatDateToUTCString(invs.dueDate);
        salesCreditNoteToUpdate.salesCreditNoteItems = salesCreditNoteItems;
        salesCreditNoteToUpdate.discountAmount = invs.discountAmount;
        salesCreditNoteToUpdate.transactionId = invs.transactionId;
        this.salesCreditNoteService.update(salesCreditNoteToUpdate).subscribe(
          {
            next: () => {
              this.loading = false;
              this.router.navigate(['/sales-credit-notes/list'])

            },
            error: (e) =>
            {
              console.error('Error during update:', e)
              this.loading = false;
            }
          }
        );
        if (this.modalInstance) {
          this.modalInstance.hide();
        }
      } else {
        const salesCreditNoteItems = invs.salesCreditNoteItems.map((inv, i) => ({
          ...inv,
        }))
        const salesCreditNoteToCreate = new SalesCreditNoteModel();
        salesCreditNoteToCreate.salesCreditNoteNo = invs.salesCreditNoteNo;
        salesCreditNoteToCreate.saleInvoiceId = invs.saleInvoiceId;
        salesCreditNoteToCreate.adjustmentReason = invs.adjustmentReason;
        salesCreditNoteToCreate.customerProfileId = invs.customerProfileId;
        salesCreditNoteToCreate.description = invs.description;
        salesCreditNoteToCreate.issueDate = formatDateToUTCString(invs.issueDate);
        salesCreditNoteToCreate.dueDate = formatDateToUTCString(invs.dueDate);
        salesCreditNoteToCreate.salesCreditNoteItems = salesCreditNoteItems;
        salesCreditNoteToCreate.discountAmount = invs.discountAmount;
        salesCreditNoteToCreate.transactionId = invs.transactionId;
        this.salesCreditNoteService.create(salesCreditNoteToCreate).subscribe(
          {
            next:() => {
              this.router.navigate(['/sales-credit-notes/list'])
              this.loading = false;

            },
            error:error => {
              console.error('Error during creation:', error)
              this.loading = false;

            }
          }
        );
      }
    }
    else {
      this.salesCreditNoteForm.markAllAsTouched();
      this.loading = false;

    }
  }

  //#region  load data

  get mainSalesClassOptions(): Array<{ label: string, value: string }> {
    return this.mainSalesArray.map(x => ({
      label: this.activeLanguage === 'en' ? `${x.englishName} | ${x.referenceCode}` : `${x.arabicName} | ${x.referenceCode}`,
      value: x.id
    }))
  }


  loadData(): void {
    this.loading = true
    forkJoin({
      mainSales: this.salesClassService.getAll()
    }).subscribe({
      next: ({ mainSales }) => {
        this.mainSalesArray = mainSales
        // Execute the method after both are loaded
        this.loading = false;
      },
      error: (err) => {
        alert("ERROR")
      }
    });
  }

  getTaxAmount() {
    const items = this.salesCreditNoteItems.controls;
    // 1) Compute each item’s pre-discount subtotal
    const subtotals = items.map(item => {
      const qty     = item.get('quantity')?.value  || 0;
      const nights  = item.get('noOfNights')?.value|| 0;
      const price   = item.get('price')?.value     || 0;
      return price * qty * nights;
    });

    // 2) Total of **all** items (taxable + exempt)
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);

    // 3) Grab the global discount
    const discount = this.salesCreditNoteForm.get("discountAmount")?.value || 0;

    // 4) Now walk each item, allocate its share of discount, then tax
    let totalTax = 0;
    items.forEach((item, i) => {
      const mainSalesClassId = item.get('mainSalesClassId')?.value;
      // decide tax rate
      const isExempt = mainSalesClassId
        ? this.mainSalesArray.find(x => x.id === mainSalesClassId)?.isTaxExempted
        : false;
      const taxRate = isExempt ? 0 : 0.15;

      // this item’s raw subtotal
      const itemSubtotal = subtotals[i];

      // item’s share of the discount (proportional to its subtotal)
      const itemDiscount = grossTotal > 0
        ? (itemSubtotal / grossTotal) * discount
        : 0;

      // taxable base for this item
      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);

      // add its tax
      totalTax += taxableBase * taxRate;
    });

    // 5) Round to 4 decimal places and return
    return Math.round(totalTax * 100) / 100;
  }


  getNetPrice() {
    // calculate from items
    const netTotal = this.salesCreditNoteItems.controls.reduce(
      (total, item) =>
        total + (item.get('price')?.value || 0) *
        (item.get('quantity')?.value || 0) *
        (item.get('noOfNights')?.value || 0),
      0
    );
    const discount = this.salesCreditNoteForm.get("discountAmount")?.value || 0;
    const discountedTotal = netTotal - discount;
    return Math.round(discountedTotal * 100) / 100;
  }

  getTotalPrice() {
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
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
        this.router.navigate(['/sales-credit-notes/list']);
      }
    })
  }

  getItemNetPrice(item:AbstractControl) {
    // calculate from items
    const quantity = item.get('quantity')?.value || 0;
    const noOfNights = item.get('noOfNights')?.value || 1;
    const price = item.get('price')?.value || 0;
    const netTotal = quantity * noOfNights * price;
    return Math.round(netTotal * 100) / 100;
  }

  getItemTaxAmount(item:AbstractControl) {
    const mainSalesClassID = item.get('mainSalesClassId')?.value;
    const mainSalesClass = this.mainSalesArray.find(x => x.id == mainSalesClassID);
    const isExempt = mainSalesClass?.isTaxExempted;
    const taxRate = isExempt ? 0 : 0.15;
    const subtotal = this.getItemNetPrice(item);
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  getItemTotalPrice(item:AbstractControl) {
    // calculate from items
    return Math.round(this.getItemNetPrice(item) * 100) / 100 + Math.round(this.getItemTaxAmount(item) * 100) / 100
  }
  get safeNetPrice(): number {
    return this.salesCreditNoteItems.controls.reduce(
      (total, item) =>
        total +
        (item.get('price')?.value || 0) *
        (item.get('quantity')?.value || 0) *
        (item.get('noOfNights')?.value || 1),
      0
    );
  }

  recalculateSafeNetPrice() {
    // Dynamic getter handles this
  }



  cancel() {

    this.confirmationCancelBeforeSavingChange();
    /*this.initiateForm();

    // Load 10 empty salesCreditNoteItems with placeholder values
    for (let i = 0; i < 10; i++) {
      this.addItem({
        id: null,
        mainSalesClassId: null,
        price: null,
        quantity: null,
        noOfNights: 1,
        tax: 15,
        taxAmount: 0,
        discount: 0,
        discountAmount: 0,
        totalPrice: 0,
        netPrice: 0,
        saleSalesCreditNoteId: this.salesCreditNoteId,
      });
    }*/
  }
}
