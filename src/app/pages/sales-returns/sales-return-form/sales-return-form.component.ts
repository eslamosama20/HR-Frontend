import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { ReturnNo } from 'src/app/models/return/returnNo';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';

import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { SalesReturnService } from 'src/app/services/salesReturn/sales-return.service';
import { SalesReturnItem } from 'src/app/models/salesReturn/salesReturnItem';
import { TranslationService } from "../../../modules/i18n";
import { forkJoin } from "rxjs";
import { CalendarModule } from "primeng/calendar";
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { formatDateToUTCString, getSystemNow } from 'src/app/utils/dateUtils';

@Component({
  selector: 'app-sales-return-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, TranslateModule, DropdownModule, CalendarModule, BackButtonComponent],
  templateUrl: './sales-return-form.component.html',
  styleUrls: ['./sales-return-form.component.scss']
})
export class SalesReturnFormComponent implements OnInit {
  loadingSignal = signal<boolean>(false);
  get loading(){
    return this.loadingSignal()
  }
  set loading(value:boolean){
    this.loadingSignal.set(value)
  }
  @ViewChild('returnModal') returnModal: ElementRef | undefined;
  private modalInstance: Modal | undefined;

  returnForm: FormGroup;
  returnId: number;
  returnNo: ReturnNo | null = null;
  isMinimized = false;
  isMaximized = false;
  customers: any[] = [];
  mainSalesArray: any[] = [];

  translate:TranslateService;
  activeLanguage:string = "en";
  constructor(
    private salesClassService: MainSalesClassService,
    private fb: FormBuilder,
    private salesReturnService: SalesReturnService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private customerService: CustomerProfileService,
    private translateService: TranslateService,
    public translationService: TranslationService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.route.paramMap.subscribe(params => {
      this.returnId = params.get('id') ? parseInt(params.get('id')!, 10) : null;
    });

    this.returnForm = this.fb.group({
      id: [this.returnId],
      returnNo: [],
      currency: ['SAR'],
      customerProfileId: [''],
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
      salesInvoiceId: [''],
      salesReturnItems: this.fb.array([])
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

  initReturnForm(){
    if (this.returnId) {
      this.salesReturnService.getReturnById(this.returnId).subscribe((salesReturn) => {
        this.returnForm.patchValue({
          ...salesReturn,
          issueDate: new Date(salesReturn.issueDate),
          dueDate: new Date(salesReturn.dueDate)
        });
        salesReturn.salesReturnItems?.forEach(item =>{
          console.log(item)
          this.addItem(item)
        });
        this.cdr.detectChanges();
      });
    } else {

      // Load 10 empty salesReturnItems with placeholder values
      for (let i = 0; i < 10; i++) {
        this.addItem({
          id: null,
          itemNo: '',
          mainSalesClassId: null,
          price: null,
          quantity: null,
          tax: 15,
          taxAmount: 0,
          discount: 0,
          discountAmount: 0,
          totalPrice: 0,
          netPrice: 0,
          salesReturnId: this.returnId,
        });
      }
      this.cdr.detectChanges()
    }

    this.updateReturnTotals();
    // this.returnForm.get('discount')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateReturnTotals());
    // this.returnForm.get('discountType')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateReturnTotals());

    // this.salesReturnItems.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateReturnTotals());

  }



  private generateReturnNum() {
    this.salesReturnService.getReturnNumber().subscribe({
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
    return this.salesReturnItems.controls
      .filter(item => {

        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;


        return price  && quantity &&(price > 0 && quantity > 0);
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
    const taxRate = parseFloat(this.returnForm.get('tax')?.value) || 15;

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
    const totalTaxAmount = filteredItems.reduce((total, item) => total + (item.taxAmount || 0), 0);

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


  get salesReturnItems(): FormArray {
    return this.returnForm.get('salesReturnItems') as FormArray;
  }


  private itemCounter = 1;

  addItem(salesReturnItem: SalesReturnItem = null): void {
    const itemFormGroup = this.fb.group({
      id: [salesReturnItem?.id ?? null],
      itemNo: [{ value: '', disabled: true }], // Set itemNo as a disabled field if it's auto-generated
      mainSalesClassId: [salesReturnItem?.mainSalesClassId],
      price: [salesReturnItem?.price, [Validators.required, Validators.min(0)]],
      quantity: [salesReturnItem?.quantity ?? 1, [Validators.required, Validators.min(0.1)]],
      discount: [salesReturnItem?.discount ?? 0 , [Validators.min(0)]],
      discountAmount: [salesReturnItem?.discountAmount ?? 0],
      netPrice: [salesReturnItem?.netPrice ?? 0],
      tax: [salesReturnItem?.tax ?? 15],
      taxAmount: [salesReturnItem?.taxAmount ?? 0],
      totalPrice: [salesReturnItem?.totalPrice ?? 0],
      salesReturnId: [this.returnId],
      unit: salesReturnItem?.mainSalesClassId
        ? this.activeLanguage =="en" ? salesReturnItem.mainSalesClass.measurementUnit.englishSymbol : salesReturnItem.mainSalesClass.measurementUnit.englishSymbol
        : ''
    });


    this.salesReturnItems.push(itemFormGroup);

    itemFormGroup.get('price')?.valueChanges.subscribe(() => this.updateReturnTotals());
    itemFormGroup.get('quantity')?.valueChanges.subscribe(() => this.updateReturnTotals());
    itemFormGroup.get('discount')?.valueChanges.subscribe(() => this.updateReturnTotals());

    this.updateReturnTotals();
  }


  removeItem(index: number): void {
    this.salesReturnItems.removeAt(index);
    this.updateReturnTotals();
    this.cdr.detectChanges();
  }


  setCustomerIdForReturn(customerIdValue: string): void {



      this.returnForm.get('customerProfileId')?.setValue(customerIdValue);

  }

  onSalesClick(event: any, item: AbstractControl<any, any>) {
    const salesId = event.value

    const salesObject = this.mainSalesArray.find(x => x.id === salesId);

    item.get('unit')?.setValue(salesObject?.measurementUnit?.arabicSymbol);
    this.cdr.detectChanges()

  }


  submitForm(): void {
    this.loading=true;
    for (let i = this.salesReturnItems.length - 1; i >= 0; i--) {
      const item = this.salesReturnItems.at(i);

      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;

      if ( !price || !quantity || price <= 0 || quantity<=0) {
        this.salesReturnItems.removeAt(i);
      }
    }


    const totalReturnPrice = this.salesReturnItems.controls.reduce((total, item) => total + (item.get('totalPrice')?.value || 0), 0);
    const totalNetPrice = this.salesReturnItems.controls.reduce((total, item) => total + (item.get('netPrice')?.value || 0), 0);
    const totalTaxAmount = this.salesReturnItems.controls.reduce((total, item) => total + (item.get('taxAmount')?.value || 0), 0);
    const totalDiscountAmount = this.salesReturnItems.controls.reduce((total, item) => total + (item.get('discountAmount')?.value || 0), 0);

    this.returnForm.patchValue({
      totalPrice: totalReturnPrice,
      netPrice: totalNetPrice,
      taxAmount: totalTaxAmount,
      discountAmount: totalDiscountAmount,
    });

     console.log(this.returnForm)

    if (this.returnForm.valid) {
      if (this.returnId) {
        const salesReturnVar = this.returnForm.value
        const salesReturnItems = salesReturnVar.salesReturnItems.map( (x,i )=>({
          ...x,
          itemNo:String(i+1)
        }) )

        const payload = {
          ...salesReturnVar,
          issueDate: salesReturnVar.issueDate ? formatDateToUTCString(salesReturnVar.issueDate) : null,
          dueDate: salesReturnVar.dueDate ? formatDateToUTCString(salesReturnVar.dueDate) : null,
          salesReturnItems: salesReturnItems
        };

        this.salesReturnService.updateReturn(this.returnId, payload).subscribe(
          () => {
            this.router.navigate(['/sales-returns/list'])
            this.loading=false;

          },
          error => {
            console.error('Error during update:', error)
            this.loading=false;

          }
        );
        if (this.modalInstance) {
          this.modalInstance.hide();
        }
      } else {
        const salesReturnVar = this.returnForm.value
        const salesReturnItems = salesReturnVar.salesReturnItems.map( (inv,i )=>({
          ...inv,
          itemNo:String(i+1)
        }) )
        const payload = {
          ...salesReturnVar,
          issueDate: salesReturnVar.issueDate ? formatDateToUTCString(salesReturnVar.issueDate) : null,
          dueDate: salesReturnVar.dueDate ? formatDateToUTCString(salesReturnVar.dueDate) : null,
          salesReturnItems: salesReturnItems
        };
        this.salesReturnService.createReturn(payload).subscribe(
          () => {
            this.router.navigate(['/sales-returns/list'])
            this.loading=false;

          },
          error => {
            console.error('Error during creation:', error)
            this.loading=false;

          }
        );
      }
    }
    else {
      this.returnForm.markAllAsTouched();
      this.loading=false;

    }
  }

  //#region  load data


  loadData(): void {
    this.loading = true
    forkJoin({
      customers: this.customerService.getAll(),
      mainSales: this.salesClassService.getAll()
    }).subscribe({
      next: ({ customers, mainSales }) => {
        this.customers = customers.filter(customer=>customer.mainAccountId).map(customer => (
          {
            label: this.activeLanguage =='en'?customer.englishName:customer.arabicName,
            value: customer.id
          }));
        this.mainSalesArray = mainSales;
        // Execute the method after both are loaded
        this.initReturnForm();
        this.loading = false;
      },
      error: (err) => {
        alert("ERROR")
      }
    });
  }

  getTaxAmount(){
    // calculate from items
    return Math.round(this.salesReturnItems.controls.reduce(
      (total, item) =>
        total + ((item.get('price')?.value * item.get('quantity')?.value) * 0.15 ),
      0
    ) * 100) / 100
  }

  getNetPrice(){
    // calculate from items
    return Math.round(this.salesReturnItems.controls.reduce(
      (total, item) =>
        total + (item.get('price')?.value * item.get('quantity')?.value),
      0) * 100) / 100

  }

  getTotalPrice(){
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }

}


