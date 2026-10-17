import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { ProjectService } from 'src/app/projects/services/project.service';

import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { RootSalesClassService } from 'src/app/services/sales-classes-tree/root-sales-class.service';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesItem } from 'src/app/models/salesInvoice/salesItem';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslationService } from "../../../modules/i18n";
import { forkJoin } from "rxjs";
import { CalendarModule } from 'primeng/calendar';
import { formatDateToUTCString, getSystemNow } from 'src/app/utils/dateUtils';
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { PrintDocumentComponent } from '../../../shared-components/print-document/print-document.component';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { QRCodeModule } from 'angularx-qrcode';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { FormatDecimalPipe } from '../../../pipes/format-decimal.pipe';
import { PrintSettingsService } from 'src/app/services/print-settings.service';

@Component({
  selector: 'app-quotation-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    FormsModule, 
    CommonModule, 
    TranslateModule, 
    DropdownModule, 
    CalendarModule, 
    BackButtonComponent,
    PrintDocumentComponent,
    QRCodeModule,
    ToastModule,
    CustomDatePipe,
    FormatDecimalPipe
  ],
  providers: [MessageService],
  templateUrl: './quotation-form.component.html',
  styleUrls: ['./quotation-form.component.scss']
})
export class QuotationFormComponent implements OnInit {
  loadingSignal = signal<boolean>(false);
  get loading(){
    return this.loadingSignal()
  }
  set loading(value:boolean){
    this.loadingSignal.set(value)
  }
  @ViewChild('invoiceModal') invoiceModal: ElementRef | undefined;
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  private modalInstance: Modal | undefined;

  // Company details for printing
  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  // QR Code for print
  qrImageUrl: string | null = null;

  // Print-related properties
  printDataColumns: any[] = [];
  printDataRows: any[] = [];
  showStamp: boolean = true;
  anyPolicyChecked: boolean = true;
  anyBankChecked: boolean = true;
  selectedPolicies: { id: string, name: string, nameEn: string, checked: boolean }[] = [];
  selectedBanks: { id: string, bankName: string, bankNameEn: string, accountNumber: string, iban: string, accountName: string, swiftCode?: string, checked: boolean }[] = [];
  showCompanySignature: boolean = true;
  showCustomerSignature: boolean = true;

  invoiceForm: FormGroup;
  invoiceId: number;
  quotationNo: { quotationNo: string } | null = null;
  isMinimized = false;
  isMaximized = false;
  customers: any[] = [];
  mainSalesArray: any[] = [];
  allCustomersRaw: any[] = [];
  projects: any[] = [];
  filteredDepartments: any[] = [];
  isLinkedToProjects: boolean = false;
  allRootsRaw: any[] = [];

  translate:TranslateService;
  activeLanguage:string = "en";
  constructor(
    private salesClassService: MainSalesClassService,
    private fb: FormBuilder,
    private salesInvoiceService: SalesInvoiceService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private customerService: CustomerProfileService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private companyDataService: CompanyDetailsService,
    private messageService: MessageService,
    private rootSalesClassService: RootSalesClassService,
    private printSettingsService: PrintSettingsService,
    private projectService: ProjectService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.route.paramMap.subscribe(params => {
      this.invoiceId = params.get('id') ? parseInt(params.get('id')!, 10) : null;
    });

    this.invoiceForm = this.fb.group({
      id: [this.invoiceId],
      invoiceNo: [null],
      currency: ['SAR'],
      customerProfileId: [''],
      customerProfileName: [''],
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
      saleItems: this.fb.array([]),
      isQuotation : [true],
      projectId: [null],
      customerDepartmentId: [null]
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
      const modalElement = this.invoiceModal.nativeElement.querySelector('.modal-dialog'); // Target the modal dialog

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

  selectedQuoteFile: File | null = null;

  onQuoteFileSelected(event: any): void {
    const files = event.target?.files;
    if (files && files.length > 0) {
      this.selectedQuoteFile = files[0];
    }
  }

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      this.invoiceId = parseInt(paramId, 10);
    }

    this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
    this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
    this.showStamp = this.printSettingsService.getShowStamp();

    // Load company details for printing
    this.loadCompanyDetails();
    
    // Check for query parameters for project linking
    const qParams = this.route.snapshot.queryParams;
    if (qParams['projectId']) {
      this.isLinkedToProjects = true;
      this.invoiceForm.patchValue({ projectId: qParams['projectId'] });
    }

    this.loadData();
    if (!this.invoiceId) {
      this.generateQuotationNum();
    }

  }

  initInvoiceForm(){
    if (this.invoiceId) {
      this.salesInvoiceService.getInvoiceById(this.invoiceId).subscribe((res: any) => {
        const invoice = res?.data || res;
        if (!invoice) return;
        
        if (invoice.projectId) {
          this.isLinkedToProjects = true;
        }
        
        this.filterCustomers();
        this.filterItems();

        if (invoice.customerProfileId) {
          const targetCustId = String(invoice.customerProfileId).toLowerCase();
          const customer = (this.allCustomersRaw || []).find(c => String(c.id).toLowerCase() === targetCustId);
          if (customer) {
            invoice.customerProfileId = customer.id;
            if (customer.departments) {
              this.filteredDepartments = customer.departments.map(dept => ({
                label: this.activeLanguage === 'en' ? (dept.nameEn || dept.nameAr) : dept.nameAr,
                value: dept.id
              }));
            }
          }
        }

        if (invoice.projectId) {
          const targetProjId = String(invoice.projectId).toLowerCase();
          const proj = (this.projects || []).find(p => String(p.value).toLowerCase() === targetProjId);
          if (proj) {
            invoice.projectId = proj.value;
          }
        }

        this.invoiceForm.patchValue({
          ...invoice,
          issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
        });
        
        this.saleItems.clear();
        const items = invoice.saleItems || invoice.items || [];
        if (items && items.length > 0) {
          items.forEach((item: any) => {
            this.addItem(item);
          });
        }
        
        this.updateInvoiceTotals();
        this.cdr.detectChanges();
      });
    } else {
      const qParams = this.route.snapshot.queryParams;
      if (qParams['projectId']) {
        this.isLinkedToProjects = true;
        this.filterCustomers();
        this.filterItems();
        this.invoiceForm.patchValue({
          projectId: qParams['projectId']
        });
        if (qParams['customerProfileId']) {
          this.invoiceForm.patchValue({
            customerProfileId: qParams['customerProfileId']
          });
          const customer = this.allCustomersRaw.find(c => c.id === qParams['customerProfileId']);
          if (customer && customer.departments) {
            this.filteredDepartments = customer.departments.map(dept => ({
              label: this.activeLanguage === 'en' ? (dept.nameEn || dept.nameAr) : dept.nameAr,
              value: dept.id
            }));
          }
        }
        if (qParams['customerDepartmentId']) {
          this.invoiceForm.patchValue({
            customerDepartmentId: qParams['customerDepartmentId']
          });
        }
      }

      // Load 10 empty saleItems with placeholder values
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
          saleInvoiceId: this.invoiceId,
        });
      }
      this.cdr.detectChanges()
    }

    this.updateInvoiceTotals();
    // this.invoiceForm.get('discount')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateInvoiceTotals());
    // this.invoiceForm.get('discountType')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateInvoiceTotals());

    // this.saleItems.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateInvoiceTotals());

  }



  private generateQuotationNum() {
    this.salesInvoiceService.getQuotationNo().subscribe({
      next: (val) => {
        this.quotationNo = val;
        this.invoiceForm.controls['invoiceNo'].setValue(this.quotationNo?.quotationNo);
      },
      error: (err) => {
        console.error('Error generating invoice number', err);
      }
    });
  }



  private filterValidItems(): any[] {
    return this.saleItems.controls
      .filter(item => {

        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;


        return price  && quantity && (price > 0 && quantity > 0);
      })
      .map(item => {
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
    const mainSalesClassId = item.get('mainSalesClassId')?.value;

    let defaultTaxRate = parseFloat(this.invoiceForm.get('tax')?.value) || 15;
    let taxRate = defaultTaxRate;

    if (mainSalesClassId) {
      const mainSalesClass = this.mainSalesArray.find(
        (x) => x.id === mainSalesClassId
      );
      if (mainSalesClass && (mainSalesClass.isTaxExempted || (mainSalesClass as any).isTaxExempt)) {
        taxRate = 0;
      }
    }

    const grossPrice = price * quantity; // Calculate Gross Price
    const discountAmount = (grossPrice * itemDiscount) / 100; // Calculate Discount
    const netPrice = grossPrice - discountAmount; // Calculate Net Price
    const taxAmount = (netPrice * taxRate) / 100; // Calculate Tax Amount
    const totalPrice = netPrice + taxAmount; // Calculate Total Price

    item.get('netPrice').setValue(this.roundToTwo(netPrice));
    item.get('discountAmount').setValue(this.roundToTwo(discountAmount));
    item.get('taxAmount').setValue(this.roundToTwo(taxAmount));
    item.get('totalPrice').setValue(this.roundToTwo(totalPrice));
  }



  updateInvoiceTotals(): void {
    const filteredItems = this.filterValidItems();

    const totalInvoicePrice = filteredItems.reduce((total, item) => total + (item.totalPrice || 0), 0);
    const totalNetPrice = filteredItems.reduce((total, item) => total + (item.netPrice || 0), 0);
    const totalTaxAmount = filteredItems.reduce((total, item) => total + (item.taxAmount || 0), 0);

    const discountType = this.invoiceForm.get('discountType')?.value;
    const invoiceDiscountValue = parseFloat(this.invoiceForm.get('discount')?.value) || 0;

    let invoiceDiscountAmount = 0;

    if (discountType === 'percentage') {
      invoiceDiscountAmount = (totalInvoicePrice * invoiceDiscountValue) / 100;
    } else if (discountType === 'amount') {
      invoiceDiscountAmount = invoiceDiscountValue;
    }

    const netPriceAfterDiscount = totalNetPrice - invoiceDiscountAmount;
    const totalPriceAfterDiscount = totalNetPrice + totalTaxAmount - invoiceDiscountAmount;

    this.invoiceForm.get('totalPrice').setValue(this.roundToTwo(totalPriceAfterDiscount))
    this.invoiceForm.get('netPrice').setValue(this.roundToTwo(netPriceAfterDiscount))
    this.invoiceForm.get('taxAmount').setValue(this.roundToTwo(totalTaxAmount))
    this.invoiceForm.get('discountAmount').setValue(this.roundToTwo(invoiceDiscountAmount))
    // this.invoiceForm.patchValue({
    //   totalPrice: parseFloat(totalPriceAfterDiscount.toFixed(2)),
    //   netPrice: parseFloat(netPriceAfterDiscount.toFixed(2)),
    //   taxAmount: parseFloat(totalTaxAmount.toFixed(2)),
    //   discountAmount: parseFloat(invoiceDiscountAmount.toFixed(2)),
    // });

    this.cdr.detectChanges();
  }


  onDiscountTypeChange(event: any): void {
    const discountType = event.target.value;


    this.invoiceForm.patchValue({ discount: 0 });


    this.updateInvoiceTotals();
  }


  get saleItems(): FormArray {
    return this.invoiceForm.get('saleItems') as FormArray;
  }


  private itemCounter = 1;

  addItem(salesItem: SalesItem = null): void {
    let mainSalesClass = null;
    if (salesItem?.mainSalesClassId) {
      const targetClassId = String(salesItem.mainSalesClassId).toLowerCase();
      mainSalesClass = this.mainSalesArray.find(x => String(x.id).toLowerCase() === targetClassId);
    }

    const itemFormGroup = this.fb.group({
      id: [salesItem?.id ?? null],
      itemNo: [{ value: '', disabled: true }], // Set itemNo as a disabled field if it's auto-generated
      mainSalesClassId: [mainSalesClass ? mainSalesClass.id : (salesItem?.mainSalesClassId ?? null)],
      price: [salesItem?.price, [Validators.required, Validators.min(0)]],
      quantity: [salesItem?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      discount: [salesItem?.discount ?? 0 , [Validators.min(0)]],
      discountAmount: [salesItem?.discountAmount ?? 0],
      netPrice: [salesItem?.netPrice ?? 0],
      tax: [salesItem?.tax ?? 15],
      taxAmount: [salesItem?.taxAmount ?? 0],
      totalPrice: [salesItem?.totalPrice ?? 0],
      saleInvoiceId: [this.invoiceId],
      unit: mainSalesClass
        ? (this.activeLanguage === "en" 
            ? mainSalesClass.measurementUnit?.englishSymbol 
            : mainSalesClass.measurementUnit?.arabicSymbol)
        : ''
    });


    this.saleItems.push(itemFormGroup);

    itemFormGroup.get('price')?.valueChanges.subscribe(() => this.updateInvoiceTotals());
    itemFormGroup.get('quantity')?.valueChanges.subscribe(() => this.updateInvoiceTotals());
    itemFormGroup.get('discount')?.valueChanges.subscribe(() => this.updateInvoiceTotals());


    this.updateInvoiceTotals();
  }


  removeItem(index: number): void {
    this.saleItems.removeAt(index);
    this.updateInvoiceTotals();
    this.cdr.detectChanges();
  }


  setCustomerIdForInvoice(customerIdValue: string): void {
    this.invoiceForm.get('customerProfileId')?.setValue(customerIdValue);
    
    const selectedCustomer = this.customers.find(customer => customer.value === customerIdValue);
    if (selectedCustomer) {
      this.invoiceForm.get('customerProfileName')?.setValue(selectedCustomer.label);
    }
  }

  onCustomerChange(event: any): void {
    const customerId = event.value;
    if (customerId) {
      this.setCustomerIdForInvoice(customerId);
      const customer = this.allCustomersRaw.find(c => c.id === customerId);
      if (customer && customer.departments) {
        this.filteredDepartments = customer.departments.map(dept => ({
          label: this.activeLanguage === 'en' ? (dept.nameEn || dept.nameAr) : dept.nameAr,
          value: dept.id
        }));
      } else {
        this.filteredDepartments = [];
      }
      this.invoiceForm.get('customerDepartmentId')?.setValue(null);
    }
  }

  onSalesClick(event: any, item: AbstractControl<any, any>) {
    const salesId = event.value;

    const salesObject = this.mainSalesArray.find(x => x.id === salesId);
    
    const unitSymbol = this.activeLanguage === 'en'
      ? salesObject?.measurementUnit?.englishSymbol
      : salesObject?.measurementUnit?.arabicSymbol;

    item.get('unit')?.setValue(unitSymbol || '');
    this.updateItemValues(item as FormGroup);
    this.updateInvoiceTotals();
    this.cdr.detectChanges();
  }


  submitForm(): void {
    this.loading=true;
    if (!this.isLinkedToProjects) {
      this.invoiceForm.get('projectId')?.setValue(null);
      this.invoiceForm.get('customerDepartmentId')?.setValue(null);
    }
    for (let i = this.saleItems.length - 1; i >= 0; i--) {
      const item = this.saleItems.at(i);

      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;

      if ( !price || !quantity || price <= 0 || quantity<=0) {
        this.saleItems.removeAt(i);
      }
    }


    const totalInvoicePrice = this.saleItems.controls.reduce((total, item) => total + (item.get('totalPrice')?.value || 0), 0);
    const totalNetPrice = this.saleItems.controls.reduce((total, item) => total + (item.get('netPrice')?.value || 0), 0);
    const totalTaxAmount = this.saleItems.controls.reduce((total, item) => total + (item.get('taxAmount')?.value || 0), 0);
    const totalDiscountAmount = this.saleItems.controls.reduce((total, item) => total + (item.get('discountAmount')?.value || 0), 0);

    this.invoiceForm.patchValue({
      totalPrice: totalInvoicePrice,
      netPrice: totalNetPrice,
      taxAmount: totalTaxAmount,
      discountAmount: totalDiscountAmount,
    });

    if (this.invoiceForm.valid) {
      if (this.invoiceId) {
        const invs = this.invoiceForm.value;
        const saleItems = invs.saleItems.map((inv, i) => ({
          ...inv,
          itemNo: String(i + 1)
        }));
        const payload = {
          ...invs, 
          id: this.invoiceId,
          saleItems: saleItems, 
          isQuotation: true,
          issueDate: formatDateToUTCString(invs.issueDate),
        };
        const targetProjectId = invs.projectId || this.invoiceForm.get('projectId')?.value || this.route.snapshot.queryParams['projectId'];
        this.salesInvoiceService.updateInvoice(this.invoiceId, payload).subscribe(
          (res: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'نجاح',
              detail: 'تم تعديل عرض السعر بنجاح'
            });
            if (this.selectedQuoteFile && targetProjectId) {
              const docName = payload.invoiceNo ? `عرض سعر - ${payload.invoiceNo}` : `عرض سعر - ${this.selectedQuoteFile.name}`;
              this.projectService.uploadDocument(targetProjectId, 'عرض سعر', docName, this.selectedQuoteFile).subscribe({
                next: (docRes: any) => {
                  const docData = docRes?.data || docRes;
                  const docId = docData?.id || docData?.Id;

                  this.projectService.addPriceQuote({
                    projectId: targetProjectId,
                    quoteDate: new Date(),
                    quoteNumber: payload.invoiceNo || 'Q-' + Date.now(),
                    quoteAmount: payload.grandTotal || payload.totalAmount || 0,
                    documentId: docId,
                    saleInvoiceId: this.invoiceId
                  }).subscribe({
                    next: () => {
                      this.router.navigate(['/projects', targetProjectId]);
                      this.loading = false;
                    },
                    error: () => {
                      this.router.navigate(['/projects', targetProjectId]);
                      this.loading = false;
                    }
                  });
                },
                error: (err) => {
                  console.error('Error uploading quote document:', err);
                  this.router.navigate(targetProjectId ? ['/projects', targetProjectId] : ['/quotations/list']);
                  this.loading = false;
                }
              });
            } else {
              this.router.navigate(targetProjectId ? ['/projects', targetProjectId] : ['/quotations/list']);
              this.loading = false;
            }
          },
          error => {
            console.error('Error during update:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: error?.error?.message || 'حدث خطأ أثناء تعديل عرض السعر'
            });
            this.loading = false;
          }
        );
        if (this.modalInstance) {
          this.modalInstance.hide();
        }
      } else {
        const invs = this.invoiceForm.value;
        const saleItems = invs.saleItems.map( (inv, i) => ({
          ...inv,
          itemNo: String(i + 1)
        }));
        const payload = {
          ...invs, 
          saleItems: saleItems,
          issueDate: formatDateToUTCString(invs.issueDate),
        };
        const targetProjectId = invs.projectId || this.route.snapshot.queryParams['projectId'];
        console.log('Creating quotation with payload:', payload);
        this.salesInvoiceService.createQuotation(payload).subscribe(
          (res: any) => {
            const quotationRes = res?.data || res;
            const saleInvoiceId = quotationRes?.id || quotationRes?.Id;
            if (this.selectedQuoteFile && targetProjectId) {
              const docName = payload.invoiceNo ? `عرض سعر - ${payload.invoiceNo}` : `عرض سعر - ${this.selectedQuoteFile.name}`;
              this.projectService.uploadDocument(targetProjectId, 'عرض سعر', docName, this.selectedQuoteFile).subscribe({
                next: (docRes: any) => {
                  const docData = docRes?.data || docRes;
                  const docId = docData?.id || docData?.Id;
                  
                  // Link documentId and saleInvoiceId in ProjectPriceQuote
                  this.projectService.addPriceQuote({
                    projectId: targetProjectId,
                    quoteDate: new Date(),
                    quoteNumber: payload.invoiceNo || 'Q-' + Date.now(),
                    quoteAmount: payload.grandTotal || payload.totalAmount || 0,
                    documentId: docId,
                    saleInvoiceId: saleInvoiceId
                  }).subscribe({
                    next: () => {
                      this.router.navigate(['/projects', targetProjectId]);
                      this.loading = false;
                    },
                    error: () => {
                      this.router.navigate(['/projects', targetProjectId]);
                      this.loading = false;
                    }
                  });
                },
                error: (err) => {
                  console.error('Error uploading quote document:', err);
                  this.router.navigate(targetProjectId ? ['/projects', targetProjectId] : ['/quotations/list']);
                  this.loading = false;
                }
              });
            } else {
              this.router.navigate(targetProjectId ? ['/projects', targetProjectId] : ['/quotations/list']);
              this.loading = false;
            }
          },
          error => {
            console.error('Error during creation:', error);
            this.loading = false;
          }
        );
      }
    }
    else {
      this.invoiceForm.markAllAsTouched();
      this.loading=false;

    }
  }

  //#region  load data


  loadData(): void {
    this.loading = true
    forkJoin({
      customers: this.customerService.getAll(),
      roots: this.rootSalesClassService.getAll(),
      projects: this.projectService.getAll()
    }).subscribe({
      next: ({ customers, roots, projects }) => {
        this.allCustomersRaw = customers || [];
        this.allRootsRaw = roots || [];
        this.projects = (projects?.data || []).map(p => ({
          label: p.projectNumber ? `${p.projectNumber} - ${p.projectName}` : p.projectName,
          value: p.id
        }));

        this.filterCustomers();
        this.filterItems();

        this.initInvoiceForm();
        this.loading = false;
      },
      error: (err) => {
        console.error("ERROR loading data:", err);
        alert("ERROR")
      }
    });
  }

  filterCustomers(): void {
    let filtered = this.allCustomersRaw || [];
    if (this.isLinkedToProjects) {
      filtered = filtered.filter(c => c.isForProjects === true);
    } else {
      filtered = filtered.filter(c => c.isForProjects !== true);
    }
    this.customers = filtered.filter(customer => customer.mainAccountId).map(customer => ({
      label: this.activeLanguage === 'en' ? customer.englishName : customer.arabicName,
      value: customer.id
    }));
  }

  filterItems(): void {
    const allMainSales: any[] = [];
    if (this.allRootsRaw && Array.isArray(this.allRootsRaw)) {
      this.allRootsRaw.forEach(root => {
        if (root.headerSalesClasses) {
          root.headerSalesClasses.forEach(header => {
            if (header.detailSalesClasses) {
              header.detailSalesClasses.forEach(detail => {
                const isProjectDetail = detail.isForProjects === true;
                if (this.isLinkedToProjects) {
                  if (isProjectDetail && detail.mainSalesClasses) {
                    detail.mainSalesClasses.forEach(main => {
                      allMainSales.push(main);
                    });
                  }
                } else {
                  if (!isProjectDetail && detail.mainSalesClasses) {
                    detail.mainSalesClasses.forEach(main => {
                      allMainSales.push(main);
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    this.mainSalesArray = allMainSales.map(item => ({
      ...item,
      displayName: item.referenceCode 
        ? `${item.referenceCode} - ${this.activeLanguage === 'en' ? item.englishName : item.arabicName}`
        : (this.activeLanguage === 'en' ? item.englishName : item.arabicName)
    }));
  }

  onProjectToggleChange(isLinked: boolean): void {
    this.isLinkedToProjects = isLinked;
    this.invoiceForm.get('customerProfileId')?.setValue(null);
    this.invoiceForm.get('customerProfileName')?.setValue(null);
    this.invoiceForm.get('customerDepartmentId')?.setValue(null);
    this.invoiceForm.get('projectId')?.setValue(null);
    this.filteredDepartments = [];
    
    this.filterCustomers();
    this.filterItems();
    this.cdr.detectChanges();
  }
  //#endregion

  // ==================== PRINT FUNCTIONALITY ====================

  /**
   * Load company details for printing
   */
  private loadCompanyDetails(): void {
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        if (companyData && companyData.length > 0) {
          this.companyDetails = companyData[0];

          // Load default policies and banks
          const uncheckedPolicies = this.printSettingsService.getUncheckedPolicies();
          if (this.companyDetails?.policies) {
            this.selectedPolicies = this.companyDetails.policies
              .filter((p: any) => p.policyParagraph && p.policyParagraph.trim())
              .map(p => {
                const idStr = String(p.id || '');
                return {
                  id: idStr,
                  name: p.policyParagraph || '',
                  nameEn: p.policyParagraph || '',
                  checked: !uncheckedPolicies.includes(idStr)
                };
              });
            this.anyPolicyChecked = this.selectedPolicies.some(p => p.checked);
          }

          const uncheckedBanks = this.printSettingsService.getUncheckedBanks();
          if (this.companyDetails?.bankAccounts) {
            this.selectedBanks = this.companyDetails.bankAccounts
              .filter((b: any) => (b.bankName && b.bankName.trim()) || (b.bankAccountNumber && b.bankAccountNumber.trim()) || (b.iban && b.iban.trim()))
              .map(b => {
                const idStr = String(b.id || '');
                return {
                  id: idStr,
                  bankName: b.bankName || '',
                  bankNameEn: b.bankName || '',
                  accountName: b.accountName || '',
                  accountNumber: b.bankAccountNumber || '',
                  iban: b.iban || '',
                  swiftCode: b.swiftCode || '',
                  checked: !uncheckedBanks.includes(idStr)
                };
              });
            this.anyBankChecked = this.selectedBanks.some(b => b.checked);
          }
        }
      },
      error: (error) => {
        console.error('Error loading company details:', error);
      }
    });
  }

  /**
   * Setup print columns based on language
   */
  private setupPrintColumns(): void {
    this.printDataColumns = [
      { field: 'printRowNo',header: 'م',          headerEn: 'No',        width: '30px', cellClass: 'text-center' },
      { field: 'itemName',  header: 'الصنف',      headerEn: 'Item Name', width: '50%' },
      { field: 'unit',      header: 'الوحدة',     headerEn: 'Unit',      width: '45px', cellClass: 'text-center' },
      { field: 'quantity',  header: 'الكمية',     headerEn: 'Qty',       width: '45px', pipe: 'number', cellClass: 'text-center' },
      { field: 'price',     header: 'السعر',      headerEn: 'Price',     width: '65px', pipe: 'number', cellClass: 'text-center' },
      { field: 'netPrice',  header: 'إجمالي قبل الضريبة', headerEn: 'Total Before Tax', width: '80px', pipe: 'number', cellClass: 'text-center' },
      { field: 'taxAmount', header: 'الضريبة',    headerEn: 'Tax',       width: '65px', pipe: 'number', cellClass: 'text-center' },
      { field: 'totalPrice',header: 'الإجمالي',   headerEn: 'Total',     width: '80px', pipe: 'number', cellClass: 'text-center' },
    ];
  }

  /**
   * Prepare quotation data for printing
   */
  private prepareQuotationForPrint(): any {
    const formValue = this.invoiceForm.value;
    
    // Get customer name
    let customerName = formValue.customerProfileName || '';
    const customerId = formValue.customerProfileId;
    
    if (customerId && !customerName) {
      const customer = this.customers.find(c => c.value === customerId);
      if (customer) {
        customerName = customer.label;
      }
    }

    // Prepare print rows from valid items
    this.printDataRows = this.saleItems.controls
      .filter(item => {
        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;
        return price && quantity && price > 0 && quantity > 0;
      })
      .map((item, index) => {
        const mainSalesClassId = item.get('mainSalesClassId')?.value;
        const mainSalesClass = this.mainSalesArray.find(x => x.id === mainSalesClassId);
        
        const itemNameBase = this.activeLanguage === 'en' 
          ? mainSalesClass?.englishName || '' 
          : mainSalesClass?.arabicName || '';
          
        return {
          itemNo: mainSalesClass?.referenceCode || '',
          itemName: (mainSalesClass?.referenceCode ? mainSalesClass.referenceCode + ' - ' : '') + itemNameBase,
          unit: this.activeLanguage === 'en'
            ? mainSalesClass?.measurementUnit?.englishSymbol || ''
            : mainSalesClass?.measurementUnit?.arabicSymbol || '',
          quantity: item.get('quantity')?.value || 0,
          price: item.get('price')?.value || 0,
          netPrice: item.get('netPrice')?.value || 0,
          taxAmount: item.get('taxAmount')?.value || 0,
          totalPrice: item.get('totalPrice')?.value || 0,
        };
      });

    // Calculate totals
    const totalNetPrice = this.printDataRows.reduce((sum, row) => sum + (row.netPrice || 0), 0);
    const totalTaxAmount = this.printDataRows.reduce((sum, row) => sum + (row.taxAmount || 0), 0);
    const totalPrice = this.printDataRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
    
    const discountAmount = formValue.discountAmount || 0;
    const finalTotal = totalPrice - discountAmount;

    // Generate QR code
    const companyName = this.activeLanguage === 'en' 
      ? this.companyDetails?.englishName || ''
      : this.companyDetails?.arabicName || '';
    const taxNumber = this.companyDetails?.taxNumber || '';
    const quotationDate = formValue.issueDate ? new Date(formValue.issueDate).toISOString() : new Date().toISOString();
    
    const qrString = `${companyName}|${taxNumber}|${quotationDate}|${finalTotal.toFixed(2)}|${totalTaxAmount.toFixed(2)}`;
    this.qrImageUrl = qrString;

    return {
      invoiceNo: formValue.invoiceNo,
      issueDate: formValue.issueDate,
      customerName: customerName,
      customerTaxNumber: '',
      totalNetPrice: totalNetPrice,
      totalTaxAmount: totalTaxAmount,
      discountAmount: discountAmount,
      totalPrice: finalTotal,
      description: formValue.description || ''
    };
  }

  /**
   * Trigger print for unsaved quotation
   */
  printUnsavedQuotation(): void {
    // Always refresh print columns at print time (ensures translations are loaded)
    this.setupPrintColumns();

    // Validate that we have at least one valid item
    const hasValidItems = this.saleItems.controls.some((item) => {
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      return price && quantity && price > 0 && quantity > 0;
    });

    if (!hasValidItems) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('INVOICE.WARNING'),
        detail: this.translateService.instant('INVOICE.AT_LEAST_ONE_ITEM_REQUIRED'),
        life: 4000,
      });
      return;
    }

    // Validate customer
    const customerId = this.invoiceForm.get('customerProfileId')?.value;
    if (!customerId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('INVOICE.WARNING'),
        detail: this.translateService.instant('INVOICE.CUSTOMER_NAME_REQUIRED'),
        life: 4000,
      });
      return;
    }

    // Prepare quotation data
    this.prepareQuotationForPrint();

    // Wait for view to update, then trigger print
    this.cdr.detectChanges();
    setTimeout(() => {
      this.triggerPrintWithoutReload();
    }, 500);
  }

  /**
   * Custom print method that doesn't reload the page
   */
  private triggerPrintWithoutReload(): void {
    if (!this.printComponent || !this.printComponent.printSection) {
      console.error('Print component not ready');
      return;
    }

    const printContent = this.printComponent.printSection.nativeElement.innerHTML;
    const currentLanguage = this.activeLanguage;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Failed to access iframe document');
      document.body.removeChild(iframe);
      return;
    }

    // Build the iframe content with proper styles
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          if (styleSheet.href) {
            return `@import url("${styleSheet.href}");`;
          }
          return '';
        }
      })
      .join('\n');

    // Write content to iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="${currentLanguage === 'ar' ? 'rtl' : 'ltr'}" lang="${currentLanguage}">
      <head>
        <meta charset="UTF-8">
        <title>Print Quotation</title>
        <style>
          ${styles}
          body { margin: 0; padding: 20px; }
          @media print {
            @page { margin: 0.5cm; }
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for iframe to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Clean up iframe after a delay
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } catch (e) {
          console.error('Print error:', e);
          document.body.removeChild(iframe);
        }
      }, 500);
    };
  }

  /**
   * Get quotation totals for print template
   */
  getQuotationTotalsForPrint(): any {
    const formValue = this.invoiceForm.value;
    return {
      netPrice: formValue.netPrice || 0,
      taxAmount: formValue.taxAmount || 0,
      discountAmount: formValue.discountAmount || 0,
      totalPrice: formValue.totalPrice || 0
    };
  }

  /**
   * Get customer name for display
   */
  getCustomerName(): string {
    const customerName = this.invoiceForm.get('customerProfileName')?.value;
    if (customerName) return customerName;
    
    const customerId = this.invoiceForm.get('customerProfileId')?.value;
    const customer = this.customers.find(c => c.value === customerId);
    return customer?.label || '';
  }

  /**
   * Get company name based on language
   */
  getCompanyName(): string {
    if (!this.companyDetails) return '';
    return this.activeLanguage === 'en' 
      ? this.companyDetails.englishName 
      : this.companyDetails.arabicName;
  }

}
