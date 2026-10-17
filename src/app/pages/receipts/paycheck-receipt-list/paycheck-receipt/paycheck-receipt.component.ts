import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { SupplierDetailsModel } from 'src/app/models/inventory/supplierDetails.model';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { TreasuryService } from 'src/app/services/treasury/treasury.service';
import { PermissionModel } from '../../../../models/auth/permission.model';
import { AuthService } from '../../../../modules/auth';
import { PERMISSIONS } from '../../../../config/permissions';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { TranslationService } from '../../../../modules/i18n';
import { ActivatedRoute, Router } from '@angular/router';
import { PaycheckReceiptsService } from '../../../../services/receipts/paycheck-receipts.service';
import { UserAccountModel } from '../../../../models/auth/userAccount.model';
import primengArTranslations from '../../../../utils/primengArTranslations';
import { PaycheckReceiptAccountModel } from '../../../../models/receipts/paycheckReceiptAccount.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  parseDateOnly,
  formatDateOnlyToString,
  getSystemNow,
} from '../../../../utils/dateUtils';
import { PaycheckReceiptModel } from '../../../../models/receipts/paycheckReceipt.model';
import { PrintDocumentComponent } from '../../../../shared-components/print-document/print-document.component';
import { CompanyDetailsModel } from '../../../../models/inventory/companyDetails.model';
import { CompanyDetailsService } from '../../../../services/inventory/company-details.service';
import { numberToWords } from '../../../../utils/numberToWords';
import { AttachmentModel } from '../../../../models/Attachments/attachment.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AttachmentService } from '../../../../services/attachments/attachment.service';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { ReservationSupplierService } from 'src/app/services/ReservationSupplier/reservation-supplier.service';
import { ReservationMealService } from 'src/app/services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from 'src/app/services/reservations/reservation-view.service';
import { ProjectService } from 'src/app/projects/services/project.service';
import { PaymentService } from 'src/app/services/payment/payment.service';

type Options = {
  label: string;
  value: string;
};

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
// تعريف واجهة العمليات المربوطة خارج الكلاس
interface LinkedOperation {
  type: string; // نوع العملية (فاتورة مبيعات/مشتريات/حجز...)
  reference: string; // الرقم المرجعي أو المتسلسل
  totalAmount: number; // قيمة العملية
  paidAmount: number; // مجموع المدفوعات السابقة
  remainingAmount: number; // المتبقي في العملية
}

@Component({
  selector: 'app-paycheck-receipt',
  templateUrl: './paycheck-receipt.component.html',
  styleUrls: ['./paycheck-receipt.component.scss'],
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})


export class PaycheckReceiptComponent implements OnInit{
  // تخزين بيانات الفاتورة المرتبطة
  currentInvoice: SalesInvoice = null;
  // العمليات المربوطة بالسند
  linkedOperationsSignal = signal<LinkedOperation[]>([]);
  linkedOperationsLoadedSignal = signal<boolean>(false);
  get linkedOperations(): LinkedOperation[] {
    return this.linkedOperationsSignal();
  }
  set linkedOperations(value: LinkedOperation[]) {
    this.linkedOperationsSignal.set(value);
  }
  get linkedOperationsLoaded(): boolean {
    return this.linkedOperationsLoadedSignal();
  }
  set linkedOperationsLoaded(value: boolean) {
    this.linkedOperationsLoadedSignal.set(value);
  }
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;

  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  docColumnsSignal = signal<any[]>([]);
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }

  docDataSignal = signal<any>(null);
  get docData(): any {
    return this.docDataSignal();
  }
  set docData(value: any) {
    this.docDataSignal.set(value);
  }

  selectedPaymentMethod: string = null;
  @ViewChild('paymentMethodModal') paymentMethodModal: TemplateRef<any>;

  printDocument() {
    const formMethod = this.paycheckReceiptFormGroup?.get('paymentMethodType')?.value;
    const currentMethod = this.currentReceipt?.paymentMethodType;
    this.selectedPaymentMethod = formMethod || currentMethod || 'Cash';
    setTimeout(() => {
      if (this.printComponent) {
        this.printComponent.triggerPrint();
      }
    }, 100);
  }

  confirmPaymentMethod(modal: any) {
    if (this.selectedPaymentMethod) {
      modal.close('confirm');
    }
  }
  selectedSingularAccount = null;

  currentReceiptSignal = signal<PaycheckReceiptModel>(null);
  get currentReceipt(): PaycheckReceiptModel {
    return this.currentReceiptSignal();
  }
  set currentReceipt(value: PaycheckReceiptModel) {
    this.currentReceiptSignal.set(value);
  }

  taxOptions: any[] = []; // Tax options for dropdowns
  tax1 = { id: null, amount: null }; // Holds Tax 1 info
  tax2 = { id: null, amount: null }; // Holds Tax 2 info
  rows: any[] = []; // Array to store multiple account rows
  totalPrice = 0;
  isTableVisible: boolean = false; // Controls visibility of the dynamic table

  availableTaxOptions = [
    { label: 'صفريه', value: 0 },
    { label: 'معافاه', value: 0 },
    { label: 'القيمه المضافه', value: 0.15 },
  ];
  @ViewChild('taxModal') taxModal: TemplateRef<any>; // Reference to the tax modal
  taxAmount: number = 0;

  paycheckReceiptIdSignal = signal<string | null>(null);
  isEditModeSignal = signal<boolean>(false);
  isSubmitted: boolean = false;

  get paycheckReceiptId() {
    return this.paycheckReceiptIdSignal();
  }
  set paycheckReceiptId(value: string) {
    this.paycheckReceiptIdSignal.set(value);
  }
  get isEditMode() {
    return this.isEditModeSignal();
  }
  set isEditMode(value) {
    this.isEditModeSignal.set(value);
  }

  mainAccountsSignal = signal([]);
  get mainAccounts() {
    return this.mainAccountsSignal();
  }
  set mainAccounts(value) {
    this.mainAccountsSignal.set(value);
  }

  paycheckReceiptFormGroup: FormGroup;
  mainAccountsOptions: Options[] = [];
  treasuryOptions: Options[] = [];
  cashTreasuryOptions: Options[] = [];
  bankAccountOptions: Options[] = [];
  currentTreasuryLabel: string = 'الخزينة';
  currentTreasuryErrorMsg: string = 'الخزينة مطلوبة';
  distributionTypeOptions: Options[] = [];
  paymentMethodOptions = [
    { value: 'Cash', labelAr: 'نقدي', labelEn: 'Cash' },
    { value: 'Cheque', labelAr: 'شيك', labelEn: 'Cheque' },
    { value: 'Transfer', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
    { value: 'Card', labelAr: 'بطاقة', labelEn: 'Card' },
  ];

  onPaymentMethodChange(method: string): void {
    const isCash = !method || method === 'Cash';
    if (isCash) {
      this.currentTreasuryLabel = this.activeLanguage === 'ar' ? 'الخزينة' : 'Treasury';
      this.currentTreasuryErrorMsg = this.activeLanguage === 'ar' ? 'الخزينة مطلوبة' : 'Treasury is required';
      this.treasuryOptions = this.cashTreasuryOptions;
    } else {
      this.currentTreasuryLabel = this.activeLanguage === 'ar' ? 'الحساب البنكي / البنك' : 'Bank Account';
      this.currentTreasuryErrorMsg = this.activeLanguage === 'ar' ? 'الحساب البنكي مطلوب' : 'Bank Account is required';
      this.treasuryOptions = this.bankAccountOptions && this.bankAccountOptions.length > 0 
        ? this.bankAccountOptions 
        : this.cashTreasuryOptions;
    }
  }
  
  // Invoice table properties
  invoices: SalesInvoice[] = [];
  filteredInvoices: SalesInvoice[] = [];
  invoiceSearchQuery: string = '';
  loadingInvoices = signal(false);
  selectedInvoice: SalesInvoice | null = null;
  
  loadingSignal = signal(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value) {
    this.loadingSignal.set(value);
  }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal();
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }
  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  readonly PERMISSIONS = PERMISSIONS;

  projects: any[] = [];
  projectOptions: any[] = [];
  selectedProjectId: string | null = null;
  connectionType: 'invoice' | 'project' | 'none' = 'none';

  constructor(
    private companyDetailsService: CompanyDetailsService,
    private mainAccountService: MainAccountService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private paycheckReceiptService: PaycheckReceiptsService,
    private treasuryService: TreasuryService,
    private modalService: NgbModal,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private salesInvoiceService: SalesInvoiceService,
    private reservationSupplierService: ReservationSupplierService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private projectService: ProjectService,
    private paymentService: PaymentService
  ) {
    this.translate = translateService;
    this.isFrontal = this.router.url.includes('frontal');
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userPermissions = res.userRoles
          .map((ur) => ur.role.rolePermissions.map((rp) => rp.permission))
          .reduce((acc, val) => acc.concat(val), []);
      }
    });

    this.docColumns = [
      {
        field: 'mainAccountName',
        label: this.translate.instant('FINANCE.SUBACCOUNT'),
      },
      {
        field: 'amount',
        label: this.translate.instant('FINANCE.PRICEAMOUNT'),
        pipe: 'number',
      },
      {
        field: 'description',
        label: this.translate.instant('FINANCE.DESCRIPTION'),
      },
    ];
  }

  ngOnInit() {
    // 1) ابني الفورم أولًا (مهم جدًا قبل أي تحميل بيانات)
    this.paycheckReceiptFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: [''],
      selectedSingularAccountId: [null],
      amount: [0, [Validators.min(0.01), Validators.required]],
      tax: [0, Validators.min(0)],
      treasuryId: ['', Validators.required],
      receiptDate: [getSystemNow(), Validators.required],
      distributionType: ['auto'],
      paymentMethodType: ['Cash', Validators.required],
      checkNumber: [''],
      bankName: [''],
      bankReferenceNumber: [''],
      voucherNumber: [''],
      transactionNumber: [''],
      paycheckReceiptAccounts: [
        [],
        [this.paycheckReceiptAccountsLengthValidator()],
      ],
      transactionId: [null],
      isFrontal: [this.isFrontal],
    });

    // Initialize distribution type options
    this.distributionTypeOptions = [
      { label: this.translateService.instant('FINANCE.DISTRIBUTION_AUTO'), value: 'auto' },
      { label: this.translateService.instant('FINANCE.DISTRIBUTION_MANUAL'), value: 'manual' },
    ];

    // تحديث الجدول ليعرض فقط نوع العملية، رقم المتسلسل، وقيمة العملية
    this.paycheckReceiptFormGroup.get('amount').valueChanges.subscribe(newAmount => {
      const connectedSalesInvoiceId = this.paycheckReceiptFormGroup.get('connectedSalesInvoiceId')?.value;
      if (connectedSalesInvoiceId && this.currentInvoice) {
        const paidAmount = this.linkedOperations[0]?.paidAmount ?? 0;
        const remainingAmount = this.linkedOperations[0]?.remainingAmount ?? Math.max(0, (this.linkedOperations[0]?.totalAmount ?? 0) - paidAmount);
        if (this.rows.length === 1 && this.rows[0]) {
          const normalizedAmount = Number(newAmount) || 0;
          this.rows[0] = {
            ...this.rows[0],
            amount: normalizedAmount
          };
          const accountsControl = this.paycheckReceiptFormGroup.get('paycheckReceiptAccounts');
          if (accountsControl) {
            accountsControl.setValue(this.rows);
          }
        }
        this.linkedOperations = [{
          type: 'فاتورة مبيعات',
          reference: this.currentInvoice.invoiceNo,
          totalAmount: this.currentInvoice.totalPrice,
          paidAmount,
          remainingAmount
        }];
        this.linkedOperationsLoaded = true;
        return;
      }

      const accountsControl = this.paycheckReceiptFormGroup.get('paycheckReceiptAccounts');
      const singleAccountActive = !this.isTableVisible && accountsControl && Array.isArray(accountsControl.value) && accountsControl.value.length === 1;
      if (singleAccountActive) {
        const normalizedAmount = Number(newAmount) || 0;
        const updatedAccounts = accountsControl.value.map((account: PaycheckReceiptAccountModel) => ({
          ...account,
          amount: normalizedAmount
        }));
        accountsControl.setValue(updatedAccounts, { emitEvent: false });
      }
    });

    // Check for connectedSalesInvoiceId or connectedProjectId in query params
    this.route.queryParams.subscribe(params => {
      const connectedSalesInvoiceId = params['connectedSalesInvoiceId'];
      const connectedProjectId = params['connectedProjectId'];
      // حفظ scheduleId و returnUrl للاستخدام عند الحفظ
      if (params['scheduleId']) {
        (this as any)._scheduleId = params['scheduleId'];
      }
      if (params['returnUrl']) {
        (this as any)._returnUrl = params['returnUrl'];
      }
      // ملء بيانات من query params الخاصة بمشتريات الحجوزات
      const connectedHotelInvoiceId = params['connectedHotelInvoiceId'];
      const scheduleAmount = params['amount'];
      const scheduleVat = params['vat'];
      const scheduleNotes = params['notes'];
      const schedulMainAccountId = params['mainAccountId'];
      if (connectedHotelInvoiceId) {
        // تعيين المبلغ من الدفعة المجدولة
        if (scheduleAmount) {
          this.paycheckReceiptFormGroup.get('amount')?.setValue(+scheduleAmount);
        }
        if (scheduleVat) {
          this.paycheckReceiptFormGroup.get('tax')?.setValue(+scheduleVat);
        }
        if (scheduleNotes) {
          this.paycheckReceiptFormGroup.get('description')?.setValue(scheduleNotes);
        }
        if (schedulMainAccountId && !this.paycheckReceiptFormGroup.contains('connectedHotelInvoiceId')) {
          this.paycheckReceiptFormGroup.addControl('connectedHotelInvoiceId', this.fb.control(connectedHotelInvoiceId));
        }
        if (schedulMainAccountId) {
          this.paycheckReceiptFormGroup.get('selectedSingularAccountId')?.setValue(schedulMainAccountId);
        }
      }
      
      console.log('Query params:', { connectedSalesInvoiceId, connectedProjectId, connectedHotelInvoiceId });
      
      if (connectedSalesInvoiceId) {
        this.connectionType = 'invoice';
        this.linkedOperations = [];
        this.linkedOperationsLoaded = false;
        this.salesInvoiceService.getInvoiceById(+connectedSalesInvoiceId).subscribe({
          next: (invoice) => {
            console.log('Fetched invoice from query:', invoice);
            this.currentInvoice = invoice;
            const saleInvoiceId = Number(invoice.id ?? connectedSalesInvoiceId);
            forkJoin({
              paid: this.paycheckReceiptService.getInvoicePaidAmount(saleInvoiceId),
              remaining: this.paycheckReceiptService.getInvoiceRemainingAmount(saleInvoiceId)
            }).subscribe({
              next: ({ paid, remaining }) => {
                const safePaid = Number.isFinite(paid) ? paid : 0;
                const safeRemaining = Number.isFinite(remaining) ? remaining : Math.max(0, (invoice.totalPrice ?? 0) - safePaid);
                this.linkedOperations = [{
                  type: 'فاتورة مبيعات',
                  reference: invoice.invoiceNo,
                  totalAmount: invoice.totalPrice,
                  paidAmount: safePaid,
                  remainingAmount: safeRemaining
                }];
                this.linkedOperationsLoaded = true;
              },
              error: () => {
                const total = invoice.totalPrice ?? 0;
                this.linkedOperations = [{
                  type: 'فاتورة مبيعات',
                  reference: invoice.invoiceNo,
                  totalAmount: total,
                  paidAmount: 0,
                  remainingAmount: total
                }];
                this.linkedOperationsLoaded = true;
              }
            });
            // تعيين حساب العميل في النموذج
            if (invoice.customerProfile?.mainAccountId) {
              this.paycheckReceiptFormGroup.get('selectedSingularAccountId').setValue(invoice.customerProfile.mainAccountId);
              
              // إنشاء صف تلقائي للحساب مع مبلغ الفاتورة
              const accountRow = new PaycheckReceiptAccountModel({
                mainAccountId: invoice.customerProfile.mainAccountId,
                description: `سند قبض للفاتورة رقم ${invoice.invoiceNo}`,
                amount: invoice.totalPrice,
                tax: 0,
                paycheckReceiptId: null,
              });
              this.rows = [accountRow];
              
              // تعيين مبلغ السند ليكون مساوياً لمبلغ الفاتورة
              this.paycheckReceiptFormGroup.get('amount').setValue(invoice.totalPrice);
            }
            // حفظ معرف الفاتورة المرتبطة في النموذج
            if (!this.paycheckReceiptFormGroup.contains('connectedSalesInvoiceId')) {
              this.paycheckReceiptFormGroup.addControl('connectedSalesInvoiceId', this.fb.control(invoice.id));
            } else {
              this.paycheckReceiptFormGroup.get('connectedSalesInvoiceId').setValue(invoice.id);
            }
          },
          error: (err) => {
            console.error('Error fetching invoice from query:', err);
            this.linkedOperations = [];
            this.currentInvoice = null;
            this.linkedOperationsLoaded = true;
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: 'تعذر جلب بيانات الفاتورة المرتبطة'
            });
          }
        });
      } else if (connectedProjectId) {
        this.connectionType = 'project';
        this.selectedProjectId = connectedProjectId;
        this.linkedOperations = [];
        this.linkedOperationsLoaded = false;
        
        this.projectService.getById(connectedProjectId).subscribe({
          next: (res) => {
            const project = res.data;
            if (project) {
              this.linkedOperations = [{
                type: 'مشروع',
                reference: project.projectName,
                totalAmount: project.totalAmount || 0,
                paidAmount: 0,
                remainingAmount: project.totalAmount || 0
              }];
              this.linkedOperationsLoaded = true;
              
              // If project has assignment/details, pre-fill project information or default account if applicable
              if (project.totalAmount) {
                this.paycheckReceiptFormGroup.get('amount').setValue(project.totalAmount);
              }
            }
          },
          error: (err) => {
            console.error('Error loading project details:', err);
            this.linkedOperationsLoaded = true;
          }
        });
      }
    });

    this.paycheckReceiptFormGroup.get('paymentMethodType')?.valueChanges.subscribe(method => {
      this.onPaymentMethodChange(method);
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }
    // 3) حمّل القوائم (الخزائن + الحسابات) + حدّد وضع التعديل لو فيه :id
    // مهم: نستدعيها بعد بناء الفورم
    this.loadData();
    
    // 4) Load invoices for the table
    this.loadInvoices();

    // 4) وضع النسخ عبر ?copyId=XXXX عندما لا نكون في وضع التعديل (:id غير موجود)
    const routeId = this.route.snapshot.paramMap.get('id');
    const copyId = this.route.snapshot.queryParamMap.get('copyId');

    if (!routeId && copyId) {
      // لسنا في وضع التعديل
      this.isEditMode = false;
      this.paycheckReceiptId = null;

      // نظّف سياق العرض/الطباعة والعمليات المربوطة
      this.currentReceipt = null;
      this.docData = null;
      this.linkedOperations = [];

      // اجلب السند المراد نسخه
      this.paycheckReceiptService.getById(copyId).subscribe({
        next: (src: PaycheckReceiptModel) => {
          // نسخة مع تنظيف الحقول التي لا يجب نسخها
          const cloned = { ...src };
          cloned.id = null;
          cloned.transactionId = null;

          // التاريخ: إمّا نخليه null (يفرض على المستخدم اختياره) أو new Date()
          const newReceiptDate: Date | null = null; // غيّرها لـ new Date() لو تحب تاريخ اليوم

          // جهّز الحسابات المنسوخة
          const accounts = (src.paycheckReceiptAccounts || []).map(
            (a) =>
              new PaycheckReceiptAccountModel({
                mainAccountId: a.mainAccountId,
                description: a.description,
                amount: a.amount,
                tax: a.tax ?? 0,
                paycheckReceiptId: null,
              })
          );

          // لو حساب واحد ⇒ استخدام اختيار مفرد، لو أكثر ⇒ فعّل الجدول
          if (accounts.length <= 1) {
            this.isTableVisible = false;
            this.rows = [];

            this.paycheckReceiptFormGroup.patchValue({
              id: null,
              referenceNumber: '', // أو '' لو ممنوع تكرار المرجع
              description: cloned.description,
              selectedSingularAccountId: accounts[0]?.mainAccountId ?? null,
              amount: cloned.amount,
              tax: cloned.tax ?? 0,
              treasuryId: cloned.treasury?.id || cloned.treasuryId || null,
              receiptDate: newReceiptDate,
              paycheckReceiptAccounts: [],
              transactionId: null,
              isFrontal: this.isFrontal,
            });
          } else {
            this.isTableVisible = true;
            this.rows = accounts;

            this.paycheckReceiptFormGroup.patchValue({
              id: null,
              referenceNumber: '', // أو '' حسب سياستك
              description: cloned.description,
              amount: cloned.amount,
              tax: cloned.tax ?? 0,
              treasuryId: cloned.treasury?.id || cloned.treasuryId || null,
              receiptDate: newReceiptDate,
              paycheckReceiptAccounts: accounts,
              transactionId: null,
              isFrontal: this.isFrontal,
            });
          }

          // احسب الضريبة المعروضة إن لزم
          this.taxAmount =
            (this.paycheckReceiptFormGroup.get('amount')?.value || 0) *
            (this.paycheckReceiptFormGroup.get('tax')?.value || 0);
        },
        error: (err) => {
          console.error('Error loading source paycheck receipt for copy', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPT_LOADING_ERROR'),
          });
        },
      });
    }

    // 5) لا تستدعي loadLinkedOperations هنا لأن currentReceipt لسه مش محمّل في وضع التعديل
    // هننقل النداء ليتم بعد تحميل السند في loadPaycheckReceipt()
  }

  paycheckReceiptAccountsLengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const paycheckReceiptAccounts = control.value;
      if (paycheckReceiptAccounts.length < 1) {
        return {
          minLength: {
            requiredLength: 1,
            actualLength: paycheckReceiptAccounts.length,
          },
        };
      }
      return null;
    };
  }

  loadData(): void {
    this.loading = true;
    const paycheckReceiptId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!paycheckReceiptId;

    forkJoin({
      treasury: this.treasuryService.getAll(),
      bankAccounts: this.treasuryService.getAllGeneralBankAccounts().pipe(catchError(() => of([]))),
      mainAccounts: this.mainAccountService.getAll(),
      projects: this.projectService.getAll()
    }).subscribe({
      next: ({ treasury, bankAccounts, mainAccounts, projects }) => {
        this.cashTreasuryOptions = (treasury || []).map((t) => ({
          label: t.name || (t as any).arabicName || (t as any).englishName,
          value: t.id,
        }));

        this.bankAccountOptions = (bankAccounts || []).map((b) => ({
          label: b.bankName ? `${b.accountName} - ${b.bankName}` : (b.accountName || (b as any).name || 'حساب بنكي'),
          value: b.id,
        }));

        const currentMethod = this.paycheckReceiptFormGroup?.get('paymentMethodType')?.value || 'Cash';
        this.onPaymentMethodChange(currentMethod);

        // Handle main accounts
        this.mainAccounts = mainAccounts;
        this.mainAccountsOptions = mainAccounts.map((mainAccount) => ({
          label:
            this.activeLanguage === 'en'
              ? `${mainAccount.referenceCode} | ${mainAccount.englishName}`
              : `${mainAccount.referenceCode} | ${mainAccount.arabicName}`,
          value: mainAccount.id,
        }));

        // Handle projects
        this.projects = projects?.data || [];
        this.projectOptions = this.projects.map(project => ({
          label: project.projectName,
          value: project.id
        }));

        // Handle transaction (if in edit mode)
        this.loadMode();
        console.log('All data loaded successfully.');
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR'),
        });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  loadMode() {
    this.paycheckReceiptId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.paycheckReceiptId;
    if (this.isEditMode) {
      this.loadCompanyDetails();
      this.loadPaycheckReceipt(this.paycheckReceiptId);
    }
  }

  loadPaycheckReceipt(id: string) {
    this.paycheckReceiptService.getById(id).subscribe({
      next: paycheckReceipt => {
        console.log('Fetched paycheckReceipt:', paycheckReceipt);
        this.currentReceipt = paycheckReceipt;
        this.linkedOperationsLoaded = false;
        this.docData = paycheckReceipt.paycheckReceiptAccounts.map(entry => ({
          ...entry,
          mainAccountName: this.activeLanguage == "en" ? entry.mainAccount.englishName : entry.mainAccount.arabicName
        }));
        if (paycheckReceipt.paycheckReceiptAccounts.length == 1) {
          this.paycheckReceiptFormGroup.get('selectedSingularAccountId')
            .setValue(paycheckReceipt.paycheckReceiptAccounts[0].mainAccountId);
          this.selectedSingularAccount =
            paycheckReceipt.paycheckReceiptAccounts[0];
          paycheckReceipt.paycheckReceiptAccounts = [];
        } else {
          this.toggleTableVisibility();
          this.rows = paycheckReceipt.paycheckReceiptAccounts;
        }

        this.taxAmount = paycheckReceipt.amount * paycheckReceipt.tax;

        // Convert receiptDate to Date object for p-calendar
        let receiptDateValue: Date;
        if (typeof paycheckReceipt.receiptDate === 'string') {
          receiptDateValue = new Date(paycheckReceipt.receiptDate);
        } else {
          receiptDateValue = paycheckReceipt.receiptDate instanceof Date 
            ? paycheckReceipt.receiptDate 
            : new Date(paycheckReceipt.receiptDate);
        }
        
        this.paycheckReceiptFormGroup.patchValue({
          ...paycheckReceipt,
          receiptDate: receiptDateValue,
          paymentMethodType: this.mapPaymentMethodEnumToString(paycheckReceipt.paymentMethodType),
        });

        // جلب بيانات الفواتير المرتبطة من receiptConnections
        this.loadLinkedOperationsFromReceiptConnections(paycheckReceipt);

        // Pre-select connection type and project ID if project connection exists
        const prjConn = paycheckReceipt.receiptConnections?.find((rc: any) => rc.projectId);
        const targetProjectId = prjConn?.projectId || (paycheckReceipt as any)?.projectId || (paycheckReceipt as any)?.selectedProjectId;
        if (targetProjectId) {
          this.connectionType = 'project';
          this.selectedProjectId = targetProjectId;
          this.loadProjectCompanyDetails(targetProjectId);
        } else if (paycheckReceipt.receiptConnections?.some((rc: any) => rc.saleInvoiceId)) {
          this.connectionType = 'invoice';
        }
        
        // Check if receipt has connected sales invoice (fallback)
        const connectedSalesInvoiceId = paycheckReceipt.connectedSalesInvoiceId;
        if (connectedSalesInvoiceId && (!paycheckReceipt.receiptConnections || paycheckReceipt.receiptConnections.length === 0)) {
          this.salesInvoiceService.getInvoiceById(+connectedSalesInvoiceId).subscribe({
            next: (invoice) => {
              console.log('Fetched invoice from receipt (fallback):', invoice);
              this.currentInvoice = invoice;
              this.linkedOperations = [{
                type: 'فاتورة مبيعات',
                reference: invoice.invoiceNo,
                totalAmount: invoice.totalPrice,
                paidAmount: invoice.netPrice,
                remainingAmount: invoice.totalPrice - invoice.netPrice
              }];
            },
            error: (err) => {
              console.error('Error fetching invoice from receipt:', err);
              this.linkedOperations = [];
              this.currentInvoice = null;
            }
          });
        }
      },
      error: error => {
        console.error('Error Loading Receipt', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RECEIPT_LOADING_ERROR')
        });
      }
    });
  }
  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  mapPaymentMethodStringToEnum(value: string): number {
    if (value === 'Cash') return 1;
    if (value === 'Cheque') return 2;
    if (value === 'Card') return 3;
    if (value === 'Transfer') return 4;
    return 1;
  }

  mapPaymentMethodEnumToString(value: number | string): string {
    const val = Number(value);
    if (val === 1) return 'Cash';
    if (val === 2) return 'Cheque';
    if (val === 3) return 'Card';
    if (val === 4) return 'Transfer';
    return 'Cash';
  }

  savePaycheckReceipt() {
    this.isSubmitted = true;
    this.loading = true;

    const paycheckReceiptValues = this.paycheckReceiptFormGroup.value;    
    // إنشاء حساب تلقائي إذا لم يكن هناك حسابات وكان هناك حساب مفرد محدد
    if (paycheckReceiptValues.selectedSingularAccountId && paycheckReceiptValues.paycheckReceiptAccounts.length == 0){
      paycheckReceiptValues.paycheckReceiptAccounts = [new PaycheckReceiptAccountModel({
        mainAccountId: this.paycheckReceiptFormGroup.get('selectedSingularAccountId').value,
        amount: paycheckReceiptValues.amount,
        tax: paycheckReceiptValues.tax,
      })];
      this.paycheckReceiptFormGroup.get('paycheckReceiptAccounts').setValue(paycheckReceiptValues.paycheckReceiptAccounts);
    } else if (this.isTableVisible && this.rows.length > 0) {
      paycheckReceiptValues.paycheckReceiptAccounts = this.rows;
    } else {
      const accountsControl = this.paycheckReceiptFormGroup.get('paycheckReceiptAccounts');
      if (accountsControl && accountsControl.value?.length === 1) {
        const normalizedAmount = Number(paycheckReceiptValues.amount) || 0;
        const updatedAccounts = accountsControl.value.map((account: PaycheckReceiptAccountModel) => ({
          ...account,
          amount: normalizedAmount
        }));
        accountsControl.setValue(updatedAccounts);
        paycheckReceiptValues.paycheckReceiptAccounts = updatedAccounts;
      }
    }
    
    // التحقق من توازن المبالغ فقط إذا كانت هناك حسابات يدوية (وليس من الفاتورة)
    if (
      paycheckReceiptValues.amount === 0 ||
      paycheckReceiptValues.amount === null ||
      paycheckReceiptValues.amount === undefined
    ) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: 'لا يمكن حفظ السند عندما يكون المبلغ صفر',
      });
      this.loading = false;
      return;
    }
    if (
      paycheckReceiptValues.selectedSingularAccountId &&
      paycheckReceiptValues.paycheckReceiptAccounts.length == 0
    ) {
      paycheckReceiptValues.paycheckReceiptAccounts = [
        new PaycheckReceiptAccountModel({
          mainAccountId: this.paycheckReceiptFormGroup.get(
            'selectedSingularAccountId'
          ).value,
          amount: paycheckReceiptValues.amount,
          tax: paycheckReceiptValues.tax,
        }),
      ];
      this.paycheckReceiptFormGroup
        .get('paycheckReceiptAccounts')
        .setValue(paycheckReceiptValues.paycheckReceiptAccounts);
    } else if (this.isTableVisible) {
      paycheckReceiptValues.paycheckReceiptAccounts = this.rows;
    }
    // اجمع مبالغ الحسابات بأمان
    const sumAccounts = (
      paycheckReceiptValues.paycheckReceiptAccounts || []
    ).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // تأكد من تساوي المبلغ مع هامش بسيط لتجنب مشاكل الكسور (0.01)
    const headerAmount = Number(paycheckReceiptValues.amount) || 0;
    const EPS = 0.01;
    if (Math.abs(sumAccounts - headerAmount) >= EPS) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail:
          this.activeLanguage === 'ar'
            ? 'مجموع مبالغ الحسابات لا يساوي مبلغ السند'
            : 'The sum of account amounts does not equal the receipt amount',
        life: 6000,
      });
      this.loading = false;
      return;
    }

    console.log('paycheckReceiptValues', paycheckReceiptValues);
    if (paycheckReceiptValues.id) {
      const paycheckReceipt = new PaycheckReceiptModel();
      paycheckReceipt.id = paycheckReceiptValues.id;
      paycheckReceipt.referenceNumber = paycheckReceiptValues.referenceNumber;
      paycheckReceipt.description = paycheckReceiptValues.description;
      paycheckReceipt.receiptDate =
        typeof paycheckReceiptValues.receiptDate === 'string'
          ? formatDateOnlyToString(
              parseDateOnly(paycheckReceiptValues.receiptDate)
            )
          : formatDateOnlyToString(paycheckReceiptValues.receiptDate);
      paycheckReceipt.treasuryId = paycheckReceiptValues.treasuryId;
      paycheckReceipt.amount = paycheckReceiptValues.amount;
      paycheckReceipt.tax = paycheckReceiptValues.tax;
      paycheckReceipt.transactionId = paycheckReceiptValues.transactionId;
      paycheckReceipt.isFrontal = paycheckReceiptValues.isFrontal;
      paycheckReceipt.paymentMethodType = this.mapPaymentMethodStringToEnum(paycheckReceiptValues.paymentMethodType);
      paycheckReceipt.checkNumber = paycheckReceiptValues.checkNumber;
      paycheckReceipt.bankName = paycheckReceiptValues.bankName;
      paycheckReceipt.bankReferenceNumber = paycheckReceiptValues.bankReferenceNumber;
      paycheckReceipt.voucherNumber = paycheckReceiptValues.voucherNumber;
      paycheckReceipt.transactionNumber = paycheckReceiptValues.transactionNumber;

      paycheckReceipt.paycheckReceiptAccounts =
        paycheckReceiptValues.paycheckReceiptAccounts.map((p) => ({
          ...p,
          paycheckReceiptId: paycheckReceiptValues.id,
        }));

      // Add project or invoice connection if selected
      if (this.connectionType === 'project' && this.selectedProjectId) {
        paycheckReceipt.receiptConnections = [{
          projectId: this.selectedProjectId,
          linkedAmount: paycheckReceiptValues.amount,
          receiptConnectionType: 4, // Project = 4
          description: `ربط السند بالمشروع: ${this.projects.find(p => p.id === this.selectedProjectId)?.projectName || ''}`
        } as any];
      } else if (this.connectionType === 'invoice' && paycheckReceiptValues.connectedSalesInvoiceId) {
        paycheckReceipt.connectedSalesInvoiceId = paycheckReceiptValues.connectedSalesInvoiceId;
        paycheckReceipt.receiptConnections = [{
          saleInvoiceId: paycheckReceiptValues.connectedSalesInvoiceId,
          linkedAmount: paycheckReceiptValues.amount,
          receiptConnectionType: 1, // SalesInvoice = 1
          description: `ربط السند بالفاتورة رقم ${this.currentInvoice?.invoiceNo || paycheckReceiptValues.connectedSalesInvoiceId}`
        } as any];
      } else {
        paycheckReceipt.receiptConnections = [];
      }

      this.paycheckReceiptService.update(paycheckReceipt).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.RECEIPT_UPDATED'),
          });
          if (this.isFrontal) {
            this.router.navigate(['/receipts/frontal-paycheck-receipts/']);
          } else {
            this.router.navigate(['/receipts/paycheck-receipts/']);
          }
        },
        error: (error) => {
          console.log('Error Saving Receipt', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPT_SAVING_ERROR'),
          });
          this.loading = false;
        },
      });
    } else {
      const paycheckReceipt = new PaycheckReceiptModel();
      paycheckReceipt.referenceNumber = paycheckReceiptValues.referenceNumber;
      paycheckReceipt.description = paycheckReceiptValues.description;
      paycheckReceipt.receiptDate =
        typeof paycheckReceiptValues.receiptDate === 'string'
          ? formatDateOnlyToString(
              parseDateOnly(paycheckReceiptValues.receiptDate)
            )
          : formatDateOnlyToString(paycheckReceiptValues.receiptDate);
      paycheckReceipt.treasuryId = paycheckReceiptValues.treasuryId;
      paycheckReceipt.amount = paycheckReceiptValues.amount;
      paycheckReceipt.tax = paycheckReceiptValues.tax;
      paycheckReceipt.paymentMethodType = this.mapPaymentMethodStringToEnum(paycheckReceiptValues.paymentMethodType);
      paycheckReceipt.checkNumber = paycheckReceiptValues.checkNumber;
      paycheckReceipt.bankName = paycheckReceiptValues.bankName;
      paycheckReceipt.bankReferenceNumber = paycheckReceiptValues.bankReferenceNumber;
      paycheckReceipt.voucherNumber = paycheckReceiptValues.voucherNumber;
      paycheckReceipt.transactionNumber = paycheckReceiptValues.transactionNumber;

      paycheckReceipt.paycheckReceiptAccounts =
        paycheckReceiptValues.paycheckReceiptAccounts;
      paycheckReceipt.isFrontal = this.isFrontal;
      
      // Add project or invoice connection if selected
      if (this.connectionType === 'project' && this.selectedProjectId) {
        paycheckReceipt.receiptConnections = [{
          projectId: this.selectedProjectId,
          linkedAmount: paycheckReceiptValues.amount,
          receiptConnectionType: 4, // Project = 4
          description: `ربط السند بالمشروع: ${this.projects.find(p => p.id === this.selectedProjectId)?.projectName || ''}`
        } as any];
      } else if (this.connectionType === 'invoice' && paycheckReceiptValues.connectedSalesInvoiceId) {
        paycheckReceipt.connectedSalesInvoiceId = paycheckReceiptValues.connectedSalesInvoiceId;
        paycheckReceipt.receiptConnections = [{
          saleInvoiceId: paycheckReceiptValues.connectedSalesInvoiceId,
          linkedAmount: paycheckReceiptValues.amount,
          receiptConnectionType: 1, // SalesInvoice = 1
          description: `ربط السند بالفاتورة رقم ${this.currentInvoice?.invoiceNo || paycheckReceiptValues.connectedSalesInvoiceId}`
        } as any];
      }

      console.log(paycheckReceipt);

      this.paycheckReceiptService.create(paycheckReceipt).subscribe({
        next: (res) => {
          console.log('Receipt Saved', res);
          this.messageService.add({ 
            severity: 'success', 
            summary: this.translate.instant('FINANCE.CONFIRMED'), 
            detail: 'تم حفظ السند بنجاح.' 
          });
          
          // تحديث البيانات المحلية بعد الحفظ الناجح
          this.currentReceipt = res;
          this.isEditMode = true;
          
          // تحديث الـ form بالـ ID الجديد
          this.paycheckReceiptFormGroup.patchValue({
            id: res.id,
            referenceNumber: res.referenceNumber
          });
          
          // توقف loading
          this.loading = false;
          
          // لو جاء المستخدم من مشتريات الحجوزات مع scheduleId و returnUrl
          // نرجع لصفحة مشتريات الحجوزات مع رقم السند لربط الدفعة
          const scheduleId = (this as any)._scheduleId;
          const returnUrl = (this as any)._returnUrl;
          if (scheduleId && returnUrl) {
            const receiptNo = (res as any).receiptNo || res.voucherNumber || res.referenceNumber || res.id;
            // ربط السند بالدفعة المجدولة في قاعدة البيانات أولاً
            this.paymentService.linkReceiptToSchedule(scheduleId, res.id, receiptNo?.toString() || '').subscribe({
              next: () => {
                setTimeout(() => {
                  this.router.navigateByUrl(
                    `${returnUrl}?scheduleId=${scheduleId}&receiptNo=${encodeURIComponent(receiptNo)}&receiptId=${res.id}`
                  );
                }, 300);
              },
              error: () => {
                // حتى لو فشل الربط في الباكيند، نرجع مع البيانات للتحديث اليدوي
                setTimeout(() => {
                  this.router.navigateByUrl(
                    `${returnUrl}?scheduleId=${scheduleId}&receiptNo=${encodeURIComponent(receiptNo)}&receiptId=${res.id}`
                  );
                }, 300);
              }
            });
          } else {
            // السلوك الافتراضي - البقاء في صفحة السند
            if (res.receiptConnections && res.receiptConnections.length > 0) {
              this.loadLinkedOperationsFromReceiptConnections(res);
            } else {
              setTimeout(() => {
                this.router.navigate(['/receipts/paycheck-receipts/' + res.id]);
              }, 1500);
            }
          }
        },
        error: (error) => {
          console.log('Error Saving Receipt', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPT_SAVING_ERROR'),
          });
          this.loading = false;
        },
      });
    }
  }

  navigateToPaycheckReceiptsPage() {
    if (this.isFrontal) {
      this.router.navigate(['/receipts/frontal-paycheck-receipts/']);
    } else {
      this.router.navigate(['/receipts/paycheck-receipts/']);
    }
  }

  openTaxModal(): void {
    this.modalService.open(this.taxModal, { size: 'lg' });
  }
  onPriceOrTaxChange(): void {
    // When price or tax changes, recalculate the tax amount and total price
    const selectedTax1 = this.tax1.amount;
    const selectedTax2 = this.tax2.amount;
    if (this.tax1.amount || this.tax2.amount) {
      this.paycheckReceiptFormGroup
        .get('tax')
        .setValue(this.tax1.amount + this.tax2.amount);
    }
  }
  removeTax(): void {
    this.tax1 = { id: null, amount: null };
    this.tax2 = { id: null, amount: null };
    this.paycheckReceiptFormGroup.get('tax').setValue(0);
  }
  saveTax(): void {
    if (this.tax1.amount || this.tax2.amount) {
      this.paycheckReceiptFormGroup
        .get('tax')
        .setValue(this.tax1.amount + this.tax2.amount);
    }
    // Logic to save selected tax and close the modal
    this.closeTaxModal();
  }
  closeTaxModal(): void {
    this.modalService.dismissAll();
  }

  handleSingularAccount(event: DropdownChangeEvent) {
    console.log(event);
  }

  toggleTableVisibility(): void {
    this.isTableVisible = !this.isTableVisible;
    this.paycheckReceiptFormGroup
      .get('selectedSingularAccountId')
      .setValue(null);
    this.rows = [];
  }

  removeRow(index: number): void {
    // Remove a row from the table
    this.rows.splice(index, 1);
  }
  addRow(): void {
    const account = new PaycheckReceiptAccountModel({
      mainAccountId: null,
      description: '',
      amount: 0,
      tax: null,
      paycheckReceiptId: null,
    });

    this.rows.push(account);
  }

  patchMainAccountRow(event: DropdownChangeEvent, index: number) {
    this.rows[index] = {
      ...this.rows[index],
      mainAccountId: event.value,
    };
  }
  printTable() {
    window.print();
  }

  loadCompanyDetails(companyDetailsId?: string) {
    this.companyDetailsService.getAll().subscribe({
      next: (value) => {
        if (companyDetailsId && Array.isArray(value)) {
          const matched = value.find((c: any) => c.id === companyDetailsId);
          if (matched) {
            this.companyDetails = matched;
            return;
          }
        }
        if (value && value.length > 0) {
          this.companyDetails = value[0];
        }
      },
      error(err) {
        console.error('Error loading Company details', err);
      },
    });
  }

  loadProjectCompanyDetails(projectId: string) {
    if (!projectId) return;
    this.projectService.getById(projectId).subscribe({
      next: (res: any) => {
        const project = res?.data || res;
        if (project) {
          const compId = project.companyDetailsId || project.CompanyDetailsId;
          if (compId) {
            this.loadCompanyDetails(compId);
          }
        }
      },
      error: (err) => {
        console.error('Error fetching project company details:', err);
      }
    });
  }

  onProjectChange(projectId: string) {
    if (projectId) {
      this.loadProjectCompanyDetails(projectId);
    } else {
      this.loadCompanyDetails();
    }
  }

  getCurrentReceiptTotalInWords(): string {
    const receipt = this.currentReceipt;
    if (!receipt) return '';
    const receiptTotal = receipt.amount + receipt.amount * receipt.tax;
    return numberToWords(
      receiptTotal,
      this.activeLanguage === 'en' ? 'en' : 'ar'
    );
  }

  get attachments(): AttachmentModel[] {
    return this.currentReceipt?.attachments || [];
  }
  loadAttachments() {
    this.loadPaycheckReceipt(this.paycheckReceiptId);
  }

  deleteAttachment(attachmentId: string) {
    this.loading = true;
    this.attachmentService.delete(attachmentId).subscribe((res) => {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: this.translate.instant('FINANCE.ATTACHMENT_DELETED'),
      });
      this.loadAttachments();
    });
  }

  viewDialogSignal = signal(false);
  get viewDialog() {
    return this.viewDialogSignal();
  }
  set viewDialog(value) {
    this.viewDialogSignal.set(value);
  }
  currentPdfUrlSignal = signal<SafeResourceUrl>(null);
  get currentPdfUrl() {
    return this.currentPdfUrlSignal();
  }
  set currentPdfUrl(value) {
    this.currentPdfUrlSignal.set(value);
  }

  onView(pdf: AttachmentModel) {
    this.attachmentService.downloadAttachment(pdf.id).subscribe((res) => {
      // Decode the Base64 string into a binary array
      const byteCharacters = atob(res.fileData); // Decode Base64 to binary string
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i); // Get char codes
      }
      const byteArray = new Uint8Array(byteNumbers); // Convert to Uint8Array

      // Create a Blob from the byte array
      const blob = new Blob([byteArray], { type: pdf.fileType });
      const blobUrl = URL.createObjectURL(blob); // Create object URL
      this.currentPdfUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl); // Sanitize URL

      this.viewDialog = true; // Open the dialog to view the PDF
    });
  }

  onUpdate(event: any, pdf: AttachmentModel) {
    const paycheckReceiptId = this.paycheckReceiptId;
    if (!paycheckReceiptId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.paycheckReceiptId = paycheckReceiptId;
      requestData.id = pdf.id;
      this.attachmentService.update(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.viewDialog = false;
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file);
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }
  onDelete(pdf: AttachmentModel) {
    this.attachmentService.delete(pdf.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'File deleted successfully.',
        });
        this.loadAttachments();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete file.',
        });
      },
    });
  }
  onFileSelected(event: any) {
    const paycheckReceiptId = this.paycheckReceiptId;
    if (!paycheckReceiptId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.paycheckReceiptId = paycheckReceiptId;
      this.attachmentService.create(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file); // Convert file to base64
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }

  loadLinkedOperationsFromReceiptConnections(paycheckReceipt: any) {
    this.linkedOperationsLoaded = false;
    const connections = paycheckReceipt?.receiptConnections ?? [];

    if (!connections.length) {
      this.linkedOperations = [];
      this.currentInvoice = null;
      this.linkedOperationsLoaded = true;
      return;
    }

    this.linkedOperations = connections.map((connection: any) => {
      const totalAmount = this.resolveNumber(connection.invoiceTotalAmount, connection.linkedAmount);
      const paidAmount = this.resolveNumber(connection.invoicePaidAmount, connection.linkedAmount);
      const remainingAmount = this.resolveNumber(
        connection.invoiceRemainingAmount,
        Math.max(0, totalAmount - paidAmount)
      );

      return {
        type: connection.operationType || this.getOperationType(connection),
        reference: connection.invoiceReference || this.getOperationReference(connection),
        totalAmount,
        paidAmount,
        remainingAmount,
      } as LinkedOperation;
    });

    this.linkedOperationsLoaded = true;
  }

  private resolveNumber(...values: Array<number | null | undefined>): number {
    for (const value of values) {
      if (value !== null && value !== undefined && !isNaN(Number(value))) {
        return Number(value);
      }
    }
    return 0;
  }

  private getOperationType(connection: any): string {
    if (connection?.saleInvoiceId) {
      return 'فاتورة مبيعات';
    }
    if (connection?.purchaseInvoiceId) {
      return 'فاتورة شراء';
    }
    if (connection?.reservationId) {
      return 'حجز';
    }
    return 'عملية';
  }

  private getOperationReference(connection: any): string {
    if (connection?.invoiceReference) {
      return connection.invoiceReference;
    }
    if (connection?.saleInvoiceId) {
      return `SI-${connection.saleInvoiceId}`;
    }
    if (connection?.purchaseInvoiceId) {
      return `PI-${connection.purchaseInvoiceId}`;
    }
    if (connection?.reservationId) {
      return `R-${connection.reservationId}`;
    }
    return '-';
  }

  // Invoice table methods
  loadInvoices() {
    this.loadingInvoices.set(true);
    this.salesInvoiceService.getAllInvoices().subscribe({
      next: (invoices) => {
        this.invoices = invoices || [];
        this.filteredInvoices = [...this.invoices];
        this.loadingInvoices.set(false);
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.loadingInvoices.set(false);
      }
    });
  }

  searchInvoices() {
    if (!this.invoiceSearchQuery || this.invoiceSearchQuery.trim() === '') {
      this.filteredInvoices = [...this.invoices];
      return;
    }

    const query = this.invoiceSearchQuery.toLowerCase().trim();
    this.filteredInvoices = this.invoices.filter(invoice =>
      invoice.invoiceNo?.toLowerCase().includes(query) ||
      invoice.description?.toLowerCase().includes(query)
    );
  }

  clearInvoiceSearch() {
    this.invoiceSearchQuery = '';
    this.filteredInvoices = [...this.invoices];
  }

  isInvoiceSelected(invoice: SalesInvoice): boolean {
    return this.selectedInvoice?.id === invoice.id;
  }

  onInvoiceSelect(invoice: SalesInvoice) {
    this.selectedInvoice = invoice;
    // You can add additional logic here if needed when an invoice is selected
  }

  clearInvoiceSelection() {
    this.selectedInvoice = null;
  }
}
