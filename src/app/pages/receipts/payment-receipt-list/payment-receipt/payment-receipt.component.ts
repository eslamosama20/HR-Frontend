import { CommonModule } from '@angular/common';
import {
  Component,
  LOCALE_ID,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { getSystemNow } from 'src/app/utils/dateUtils';
import { TreasuryService } from 'src/app/services/treasury/treasury.service';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
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
import { PaymentReceiptsService } from '../../../../services/receipts/payment-receipts.service';
import { UserAccountModel } from '../../../../models/auth/userAccount.model';
import primengArTranslations from '../../../../utils/primengArTranslations';
import { PaymentReceiptAccountModel } from '../../../../models/receipts/paymentReceiptAccount.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  parseDateOnly,
  formatDateOnlyToString,
} from '../../../../utils/dateUtils';
import { PaymentReceiptModel } from '../../../../models/receipts/paymentReceipt.model';
import { PrintDocumentComponent } from '../../../../shared-components/print-document/print-document.component';
import { CompanyDetailsModel } from '../../../../models/inventory/companyDetails.model';
import { PaycheckReceiptModel } from '../../../../models/receipts/paycheckReceipt.model';
import { CompanyDetailsService } from '../../../../services/inventory/company-details.service';
import { numberToWords } from 'src/app/utils/numberToWords';
import {AttachmentModel} from "../../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {AttachmentService} from "../../../../services/attachments/attachment.service";
import { ReceiptConnectionModel, ReceiptConnectionType } from 'src/app/models/receipts/receiptConnection.model';
import { BackButtonComponent } from '../../../../shared-components/back-button/back-button.component';
import { ProjectService } from 'src/app/projects/services/project.service';

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

interface LinkedOperation {
  type: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

@Component({
  selector: 'app-payment-receipt',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    DropdownModule,
    DialogModule,
    ToastModule,
    PrintDocumentComponent,
    InputNumberModule,
    CalendarModule,
    ButtonModule,
    FileUploadModule,
    CustomDatePipe,
    BackButtonComponent,
    CardModule,
    TableModule,
    CheckboxModule,
    InputTextModule,
    InputTextareaModule,
    TooltipModule,
  ],
  templateUrl: './payment-receipt.component.html',
  styleUrls: ['./payment-receipt.component.scss'],
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class PaymentReceiptComponent implements OnInit{
  connectedSalesInvoiceId: string | null = null;
  connectedSalesInvoiceAmount: number | null = null;
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

  printDocument() {
    const formMethod = this.paymentReceiptFormGroup?.get('paymentMethodType')?.value;
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

  currentReceiptSignal = signal<PaymentReceiptModel>(null);
  get currentReceipt(): PaymentReceiptModel {
    return this.currentReceiptSignal();
  }
  set currentReceipt(value: PaymentReceiptModel) {
    this.currentReceiptSignal.set(value);
  }

  taxOptions: any[] = []; // Tax options for dropdowns
  tax1 = { id: null, amount: null }; // Holds Tax 1 info
  tax2 = { id: null, amount: null }; // Holds Tax 2 info
  rows: any[] = []; // Array to store multiple account rows
  totalPrice = 0;
  selectedSingularAccount = null;
  isTableVisible: boolean = false; // Controls visibility of the dynamic table

  availableTaxOptions = [
    { label: 'صفريه', value: 0 },
    { label: 'معافاه', value: 0 },
    { label: 'القيمه المضافه', value: 0.15 },
  ];
  @ViewChild('taxModal') taxModal: TemplateRef<any>; // Reference to the tax modal
  taxAmount: number = 0;

  selectedPaymentMethod: string = null;
  @ViewChild('paymentMethodModal') paymentMethodModal: TemplateRef<any>;

  paymentReceiptIdSignal = signal<string | null>(null);
  isEditModeSignal = signal<boolean>(false);
  isSubmitted: boolean = false;

  get paymentReceiptId() {
    return this.paymentReceiptIdSignal();
  }
  set paymentReceiptId(value: string) {
    this.paymentReceiptIdSignal.set(value);
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

  paymentReceiptFormGroup: FormGroup;
  mainAccountsOptions: Options[] = [];
  treasuryOptions: Options[] = [];
  cashTreasuryOptions: Options[] = [];
  bankAccountOptions: Options[] = [];
  currentTreasuryLabel: string = 'الخزينة';
  currentTreasuryErrorMsg: string = 'الخزينة مطلوبة';

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

  linkedOperations: LinkedOperation[] = [];

  projects: any[] = [];
  projectOptions: any[] = [];
  selectedProjectId: string | null = null;
  connectionType: 'project' | 'invoice' | 'none' = 'none';

  constructor(
    private companyDetailsService: CompanyDetailsService,
    private mainAccountService: MainAccountService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private paymentReceiptService: PaymentReceiptsService,
    private treasuryService: TreasuryService,
    private modalService: NgbModal,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private salesInvoiceService: SalesInvoiceService,
    private projectService: ProjectService
  ) {
    this.translate = translateService;
    this.isFrontal = this.router.url.includes('frontal');
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
    this.paymentReceiptFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: [''],
      selectedSingularAccountId: [null],
      amount: [null, [Validators.min(0), Validators.required]],
      tax: [0, Validators.min(0)],
      treasuryId: ['', Validators.required],
      receiptDate: [getSystemNow(), Validators.required],
      paymentMethodType: ['Cash', Validators.required],
      checkNumber: [''],
      bankName: [''],
      bankReferenceNumber: [''],
      voucherNumber: [''],
      transactionNumber: [''],
      paymentReceiptAccounts: [
        [],
        [this.paymentReceiptAccountsLengthValidator()],
      ],
      transactionId: [null],
      isFrontal: [this.isFrontal],
    });

    this.paymentReceiptFormGroup.get('paymentMethodType')?.valueChanges.subscribe(method => {
      this.onPaymentMethodChange(method);
    });

    this.loadData();

      // تحقق من وجود كويري برامتر للفاتورة المرتبطة أو المشروع المرتبط
      this.route.queryParams.subscribe(params => {
        if (params['connectedSalesInvoiceId']) {
          this.connectedSalesInvoiceId = params['connectedSalesInvoiceId'];
          // جلب بيانات الفاتورة المرتبطة
          this.salesInvoiceService.getInvoiceById(parseInt(this.connectedSalesInvoiceId)).subscribe(invoice => {
            if (invoice) {
              // تحديث المبلغ المرتبط
              this.connectedSalesInvoiceAmount = invoice.totalPrice;
              
              // إضافة بيانات الفاتورة إلى جدول العمليات المرتبطة
              this.linkedOperations = [{
                type: 'فاتورة مبيعات',
                reference: invoice.invoiceNo,
                totalAmount: invoice.totalPrice,
                paidAmount: 0, // سيتم حسابه لاحقاً
                remainingAmount: invoice.totalPrice // سيتم حسابه لاحقاً
              }];
              
              // تعيين حساب العميل في النموذج
              if (invoice.customerProfile?.mainAccountId) {
                this.paymentReceiptFormGroup.get('selectedSingularAccountId')?.setValue(invoice.customerProfile.mainAccountId);
              }
              
              // تعيين مبلغ السند ليكون مساوياً لقيمة الفاتورة افتراضياً
              this.paymentReceiptFormGroup.get('amount')?.setValue(invoice.totalPrice);
            }
          });
        } else if (params['connectedProjectId']) {
          const connectedProjectId = params['connectedProjectId'];
          this.connectionType = 'project';
          this.selectedProjectId = connectedProjectId;
          
          this.projectService.getById(connectedProjectId).subscribe(res => {
            const project = res.data;
            if (project) {
              this.linkedOperations = [{
                type: 'مشروع',
                reference: project.projectName,
                totalAmount: project.totalAmount || 0,
                paidAmount: 0,
                remainingAmount: project.totalAmount || 0
              }];
              
              if (project.totalAmount) {
                this.paymentReceiptFormGroup.get('amount')?.setValue(project.totalAmount);
              }
            }
          });
        } else if (params['connectedHotelInvoiceId'] || params['amount']) {
          const connectedHotelInvoiceId = params['connectedHotelInvoiceId'];
          const invoiceNo = params['invoiceNo'];
          const amount = params['amount'] ? Number(params['amount']) : 0;
          const mainAccountId = params['mainAccountId'] ? String(params['mainAccountId']) : null;
          const notes = params['notes'];

          this.connectionType = 'invoice';
          this.linkedOperations = [{
            type: 'فاتورة مشتريات حجز',
            reference: String(invoiceNo || connectedHotelInvoiceId || ''),
            totalAmount: amount,
            paidAmount: 0,
            remainingAmount: amount
          }];

          if (amount > 0) {
            this.paymentReceiptFormGroup.get('amount')?.setValue(amount);
          }

          if (mainAccountId) {
            this.paymentReceiptFormGroup.get('selectedSingularAccountId')?.setValue(mainAccountId);

            const accountRow = new PaymentReceiptAccountModel({
              mainAccountId: mainAccountId,
              description: notes || `دفعة مشتريات حجوزات رقم ${invoiceNo || connectedHotelInvoiceId}`,
              amount: amount,
              tax: 0,
              paymentReceiptId: null,
            });
            this.rows = [accountRow];
          }

          if (notes) {
            this.paymentReceiptFormGroup.get('description')?.setValue(notes);
          }
        }
      });
    // 2) PrimeNG i18n (Arabic)
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    // 3) Load dropdown data (treasuries + accounts) & edit mode if any
    this.loadData();

    // 4) Handle Copy Mode via ?copyId=XXXX (only when NOT edit mode)
    const copyId = this.route.snapshot.queryParamMap.get('copyId');
    if (copyId) {
      // تأكد أننا لسنا في وضع التعديل
      this.isEditMode = false;
      this.paymentReceiptId = null;
      this.currentReceipt = null; // علشان الطباعة والأقسام المرتبطة ما تتداخلش
      this.docData = null;
      this.linkedOperations = [];

      this.paymentReceiptService.getById(copyId).subscribe({
        next: (src: PaymentReceiptModel) => {
          // حضّر نسخة مع تنظيف الحقول
          const cloned = { ...src };

          // إجبار إنشاء جديد
          cloned.id = null;
          cloned.transactionId = null;

          // التاريخ: فارغ (أو new Date() لو تحب)
          const newReceiptDate: Date | null = null;

          // جهّز الحسابات المنسوخة
          const accounts = (src.paymentReceiptAccounts || []).map(
            (a) =>
              new PaymentReceiptAccountModel({
                mainAccountId: a.mainAccountId,
                description: a.description,
                amount: a.amount,
                tax: a.tax ?? 0,
                paymentReceiptId: null,
              })
          );

          // لو حساب واحد ⇒ اختيار مفرد
          if (accounts.length <= 1) {
            this.isTableVisible = false;
            this.rows = [];

            this.paymentReceiptFormGroup.patchValue({
              id: null,
              referenceNumber: '', // أو '' لو تحب تولِّد مرجع جديد
              description: cloned.description,
              selectedSingularAccountId: accounts[0]?.mainAccountId ?? null,
              amount: cloned.amount,
              tax: cloned.tax ?? 0,
              treasuryId: cloned.treasury?.id || cloned.treasuryId || null,
              receiptDate: newReceiptDate,
              paymentReceiptAccounts: [], // لأننا في وضع حساب مفرد
              transactionId: null,
              isFrontal: this.isFrontal,
            });
          } else {
            // متعدد الحسابات ⇒ فعّل الجدول واملأ الصفوف
            this.isTableVisible = true;
            this.rows = accounts;

            this.paymentReceiptFormGroup.patchValue({
              id: null,
              referenceNumber: '', // أو '' لو تحب تولِّد مرجع جديد
              description: cloned.description,
              amount: cloned.amount,
              tax: cloned.tax ?? 0,
              treasuryId: cloned.treasury?.id || cloned.treasuryId || null,
              receiptDate: newReceiptDate,
              paymentReceiptAccounts: accounts,
              transactionId: null,
              isFrontal: this.isFrontal,
            });
          }

          // احسب قيمة الضريبة المعروضة (لو محتاج)
          this.taxAmount =
            (this.paymentReceiptFormGroup.get('amount')?.value || 0) *
            (this.paymentReceiptFormGroup.get('tax')?.value || 0);
        },
        error: (err) => {
          console.error('Error loading source receipt for copy', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPT_LOADING_ERROR'),
          });
        },
      });
    }
  }

  paymentReceiptAccountsLengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const paymentReceiptAccounts = control.value;
      if (paymentReceiptAccounts.length < 1) {
        return {
          minLength: {
            requiredLength: 1,
            actualLength: paymentReceiptAccounts.length,
          },
        };
      }
      return null;
    };
  }

  loadData(): void {
    this.loading = true;
    const paymentReceiptId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!paymentReceiptId;

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

        const currentMethod = this.paymentReceiptFormGroup?.get('paymentMethodType')?.value || 'Cash';
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
    this.paymentReceiptId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.paymentReceiptId;
    if (this.isEditMode) {
      this.loadCompanyDetails();
      this.loadPaymentReceipt(this.paymentReceiptId);
    }
  }

  loadPaymentReceipt(id: string) {
    this.paymentReceiptService.getById(id).subscribe({
      next: (paymentReceipt) => {
        this.currentReceipt = paymentReceipt;
        this.docData = paymentReceipt.paymentReceiptAccounts.map((entry) => ({
          ...entry,
          mainAccountName:
            this.activeLanguage == 'en'
              ? entry.mainAccount.englishName
              : entry.mainAccount.arabicName,
        }));
        if (paymentReceipt.paymentReceiptAccounts.length == 1) {
          this.paymentReceiptFormGroup
            .get('selectedSingularAccountId')
            .setValue(paymentReceipt.paymentReceiptAccounts[0].mainAccountId);
          this.selectedSingularAccount =
            paymentReceipt.paymentReceiptAccounts[0];

          paymentReceipt.paymentReceiptAccounts = [];
        } else {
          this.toggleTableVisibility();
          this.rows = paymentReceipt.paymentReceiptAccounts;
        }

        this.taxAmount = paymentReceipt.amount * paymentReceipt.tax;

        // Convert receiptDate to Date object for p-calendar
        let receiptDateValue: Date;
        if (typeof paymentReceipt.receiptDate === 'string') {
          receiptDateValue = new Date(paymentReceipt.receiptDate);
        } else {
          receiptDateValue = paymentReceipt.receiptDate instanceof Date 
            ? paymentReceipt.receiptDate 
            : new Date(paymentReceipt.receiptDate);
        }
        
        const mappedMethod = this.mapPaymentMethodEnumToString(paymentReceipt.paymentMethodType);

        let resolvedTreasuryId = paymentReceipt.treasuryId;
        if (mappedMethod !== 'Cash' && paymentReceipt.bankName && this.bankAccountOptions?.length) {
          const matchedOption = this.bankAccountOptions.find(
            (b) => b.value === paymentReceipt.treasuryId || b.label === paymentReceipt.bankName || b.label.includes(paymentReceipt.bankName)
          );
          if (matchedOption) {
            resolvedTreasuryId = matchedOption.value;
          }
        }

        this.paymentReceiptFormGroup.patchValue({
          ...paymentReceipt,
          treasuryId: resolvedTreasuryId,
          receiptDate: receiptDateValue,
          paymentMethodType: mappedMethod,
        });

        // Pre-select connection type and project ID if project connection exists
        const prjConn = paymentReceipt.receiptConnections?.find((rc: any) => rc.projectId);
        const targetProjectId = prjConn?.projectId || (paymentReceipt as any)?.projectId || (paymentReceipt as any)?.selectedProjectId;
        if (targetProjectId) {
          this.connectionType = 'project';
          this.selectedProjectId = targetProjectId;
          this.loadProjectCompanyDetails(targetProjectId);
          
          this.linkedOperations = [{
            type: 'مشروع',
            reference: prjConn?.invoiceReference || '-',
            totalAmount: prjConn?.linkedAmount || 0,
            paidAmount: prjConn?.linkedAmount || 0,
            remainingAmount: 0
          }];
        } else {
          this.connectionType = 'none';
          this.selectedProjectId = null;
          this.linkedOperations = [];
        }
      },
      error: (error) => {
        console.log('Error Loading Receipt', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RECEIPT_LOADING_ERROR'),
        });
      },
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

  savePaymentReceipt() {
    this.isSubmitted = true;

    this.loading = true;

      // تحقق من الفاليديج: لا يمكن أن يكون مبلغ السند أكبر من قيمة الفاتورة المرتبطة
      if (this.connectedSalesInvoiceAmount && this.paymentReceiptFormGroup.get('amount').value > this.connectedSalesInvoiceAmount) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.activeLanguage === 'ar'
            ? 'مبلغ السند أكبر من قيمة الفاتورة المرتبطة'
            : 'Receipt amount exceeds linked invoice amount',
          life: 6000
        });
        this.loading = false;
        return;
      }
    const paymentReceiptValues = this.paymentReceiptFormGroup.value;
    if (
      paymentReceiptValues.selectedSingularAccountId &&
      paymentReceiptValues.paymentReceiptAccounts.length === 0
    ) {
      paymentReceiptValues.paymentReceiptAccounts = [
        new PaymentReceiptAccountModel({
          mainAccountId: this.paymentReceiptFormGroup.get(
            'selectedSingularAccountId'
          ).value,
          amount: Number(paymentReceiptValues.amount) || 0,
          tax: Number(paymentReceiptValues.tax) || 0,
        }),
      ];
      this.paymentReceiptFormGroup
        .get('paymentReceiptAccounts')
        .setValue(paymentReceiptValues.paymentReceiptAccounts);
    } else {
      paymentReceiptValues.paymentReceiptAccounts = this.rows;
    }

    // إجمالي مبالغ الحسابات + هامش EPS
    const headerAmount = Number(paymentReceiptValues.amount) || 0;
    const sumAccounts = (
      paymentReceiptValues.paymentReceiptAccounts || []
    ).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
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
    console.log('paymentReceiptValues', paymentReceiptValues);
    if (paymentReceiptValues.id) {
      const paymentReceipt = new PaymentReceiptModel();
      paymentReceipt.id = paymentReceiptValues.id;
      paymentReceipt.referenceNumber = paymentReceiptValues.referenceNumber;
      paymentReceipt.description = paymentReceiptValues.description;
      paymentReceipt.receiptDate =
        typeof paymentReceiptValues.receiptDate === 'string'
          ? formatDateOnlyToString(
              parseDateOnly(paymentReceiptValues.receiptDate)
            )
          : formatDateOnlyToString(paymentReceiptValues.receiptDate);
      paymentReceipt.treasuryId = paymentReceiptValues.treasuryId;
      paymentReceipt.amount = paymentReceiptValues.amount;
      paymentReceipt.tax = paymentReceiptValues.tax;
      paymentReceipt.transactionId = paymentReceiptValues.transactionId;
      paymentReceipt.isFrontal = paymentReceiptValues.isFrontal;
      paymentReceipt.paymentMethodType = this.mapPaymentMethodStringToEnum(paymentReceiptValues.paymentMethodType);
      paymentReceipt.checkNumber = paymentReceiptValues.checkNumber;
      paymentReceipt.bankName = paymentReceiptValues.bankName;
      paymentReceipt.bankReferenceNumber = paymentReceiptValues.bankReferenceNumber;
      paymentReceipt.voucherNumber = paymentReceiptValues.voucherNumber;
      paymentReceipt.transactionNumber = paymentReceiptValues.transactionNumber;
      paymentReceipt.paymentReceiptAccounts = paymentReceiptValues.paymentReceiptAccounts.map(p=>({
        ...p,
        paymentReceiptId:paymentReceiptValues.id
      }))
      
      // Add project or invoice connection if selected
      if (this.connectionType === 'project' && this.selectedProjectId) {
        paymentReceipt.receiptConnections = [{
          projectId: this.selectedProjectId,
          linkedAmount: paymentReceiptValues.amount,
          receiptConnectionType: 4, // Project = 4
          paymentReceiptId: paymentReceiptValues.id
        } as any];
      } else if (this.connectedSalesInvoiceId) {
        paymentReceipt.receiptConnections = [{
          saleInvoiceId: parseInt(this.connectedSalesInvoiceId),
          linkedAmount: paymentReceiptValues.amount,
          receiptConnectionType: ReceiptConnectionType.SalesInvoice,
          paymentReceiptId: paymentReceiptValues.id
        } as ReceiptConnectionModel];
      } else {
        paymentReceipt.receiptConnections = [];
      }

      this.paymentReceiptService.update(paymentReceipt).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.RECEIPT_UPDATED'),
          });
          if (this.isFrontal) {
            this.router.navigate(['/receipts/frontal-payment-receipts/']);
          } else {
            this.router.navigate(['/receipts/payment-receipts/']);
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
      const paymentReceipt = new PaymentReceiptModel();
      paymentReceipt.referenceNumber = paymentReceiptValues.referenceNumber;
      paymentReceipt.description = paymentReceiptValues.description;
      paymentReceipt.receiptDate =
        typeof paymentReceiptValues.receiptDate === 'string'
          ? formatDateOnlyToString(
              parseDateOnly(paymentReceiptValues.receiptDate)
            )
          : formatDateOnlyToString(paymentReceiptValues.receiptDate);
      paymentReceipt.treasuryId = paymentReceiptValues.treasuryId;
      paymentReceipt.amount = paymentReceiptValues.amount;
      paymentReceipt.tax = paymentReceiptValues.tax;
      paymentReceipt.paymentMethodType = this.mapPaymentMethodStringToEnum(paymentReceiptValues.paymentMethodType);
      paymentReceipt.checkNumber = paymentReceiptValues.checkNumber;
      paymentReceipt.bankName = paymentReceiptValues.bankName;
      paymentReceipt.bankReferenceNumber = paymentReceiptValues.bankReferenceNumber;
      paymentReceipt.voucherNumber = paymentReceiptValues.voucherNumber;
      paymentReceipt.transactionNumber = paymentReceiptValues.transactionNumber;

      paymentReceipt.paymentReceiptAccounts =
        paymentReceiptValues.paymentReceiptAccounts;
      paymentReceipt.isFrontal = this.isFrontal;      
      
      // Add project or invoice connection if selected
      if (this.connectionType === 'project' && this.selectedProjectId) {
        paymentReceipt.receiptConnections = [{
          projectId: this.selectedProjectId,
          linkedAmount: paymentReceiptValues.amount,
          receiptConnectionType: 4, // Project = 4
          paymentReceiptId: null
        } as any];
      } else if (this.connectedSalesInvoiceId) {
        paymentReceipt.receiptConnections = [{
          saleInvoiceId: parseInt(this.connectedSalesInvoiceId),
          linkedAmount: paymentReceiptValues.amount,
          receiptConnectionType: ReceiptConnectionType.SalesInvoice,
          paymentReceiptId: null
        } as ReceiptConnectionModel];
      }
      


      this.paymentReceiptService.create(paymentReceipt).subscribe({
        next: (res) => {
          console.log('Receipt Saved', res);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.RECEIPT_CREATED'),
          });
          if (this.isFrontal) {
            this.router.navigate(['/receipts/frontal-payment-receipts/']);
          } else {
            this.router.navigate(['/receipts/payment-receipts/']);
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

  navigateToPaymentReceiptsPage() {
    if (this.isFrontal) {
      this.router.navigate(['/receipts/frontal-payment-receipts/']);
    } else {
      this.router.navigate(['/receipts/payment-receipts/']);
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
      this.paymentReceiptFormGroup
        .get('tax')
        .setValue(this.tax1.amount + this.tax2.amount);
    }
  }
  removeTax(): void {
    this.tax1 = { id: null, amount: null };
    this.tax2 = { id: null, amount: null };
    this.paymentReceiptFormGroup.get('tax').setValue(0);
  }
  saveTax(): void {
    if (this.tax1.amount || this.tax2.amount) {
      this.paymentReceiptFormGroup
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
    this.paymentReceiptFormGroup
      .get('selectedSingularAccountId')
      .setValue(null);
    this.rows = [];
  }

  removeRow(index: number): void {
    // Remove a row from the table
    this.rows.splice(index, 1);
  }
  addRow(): void {
    const account = new PaymentReceiptAccountModel({
      mainAccountId: null,
      description: '',
      amount: 0,
      tax: null,
      paymentReceiptId: null,
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
    this.loadPaymentReceipt(this.paymentReceiptId);
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
    const paymentReceiptId = this.paymentReceiptId;
    if (!paymentReceiptId) return;
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
      requestData.paymentReceiptId = paymentReceiptId;
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
    const paymentReceiptId = this.paymentReceiptId;
    if (!paymentReceiptId) return;
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
      requestData.paymentReceiptId = paymentReceiptId;
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

}
