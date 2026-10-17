import { ChangeDetectorRef, Component, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TransactionService } from '../../../../../services/accounting/transaction.service';
import { AuthService } from '../../../../../modules/auth';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../../../../modules/i18n';
import { TransactionEntryService } from '../../../../../services/accounting/transaction-entries.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserAccountModel } from '../../../../../models/auth/userAccount.model';
import { PermissionModel } from '../../../../../models/auth/permission.model';
import primengArTranslations from '../../../../../utils/primengArTranslations';
import { TransactionTypeService } from '../../../../../services/accounting/transaction-type.service';
import { MainAccountService } from '../../../../../services/accounting/main-account.service';
import { TransactionModel } from '../../../../../models/accounting/transaction.model';
import {
  formatDateOnlyToString,
  parseDateOnly,
  getSystemNow,
} from '../../../../../utils/dateUtils';
import { TransactionEntryModel } from '../../../../../models/accounting/transactionEntry.model';
import { TransactionEntriesEditableTableComponent } from './transaction-entries-editable-table/transaction-entries-editable-table.component';
import { forkJoin } from 'rxjs';
import { PrintDocumentComponent } from '../../../../../shared-components/print-document/print-document.component';
import { CompanyDetailsService } from '../../../../../services/inventory/company-details.service';
import { ActionButton, NavigationControls } from '../../../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { CompanyDetailsModel } from '../../../../../models/inventory/companyDetails.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AttachmentService } from '../../../../../services/attachments/attachment.service';
import { AttachmentModel } from '../../../../../models/Attachments/attachment.model';
import { Subscription } from 'rxjs';
import { PERMISSIONS } from '../../../../../config/permissions';

// TODO: Fix Editing Transaction Entries and Transaction
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.scss',
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class TransactionComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;

  @ViewChild(TransactionEntriesEditableTableComponent)
  transactionEntriesTable!: TransactionEntriesEditableTableComponent;
  @ViewChild('printComponent', { static: false })
  printComponent: PrintDocumentComponent;

  // Actions menu
  customButtons: ActionButton[] = [];

  // Navigation controls
  allTransactionIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;

  private routeSubscription: Subscription;

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
    this.printComponent.triggerPrint();
  }
  transactionIdSignal = signal<string | null>(null);
  isEditModeSignal = signal<boolean>(false);
  isReadOnlySignal = signal<boolean>(false);
  get isReadOnly() {
    return this.isReadOnlySignal();
  }
  set isReadOnly(value) {
    this.isReadOnlySignal.set(value);
  }

  isAddTransactionEntry: boolean = false;
  get transactionId() {
    return this.transactionIdSignal();
  }
  set transactionId(value) {
    this.transactionIdSignal.set(value);
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

  transactionFormGroup: FormGroup;
  mainAccountsOptions = [];
  transactionTypesOptions = [];
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

  constructor(
    private companyDetailsService: CompanyDetailsService,
    private transactionService: TransactionService,
    private transactionTypeService: TransactionTypeService,
    private mainAccountService: MainAccountService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private transactionEntryService: TransactionEntryService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private cdr: ChangeDetectorRef
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
        label: this.translate.instant('FINANCE.MAIN_ACCOUNT'),
      },
      {
        field: 'debitAmount',
        label: this.translate.instant('FINANCE.DEBIT'),
        pipe: 'number',
      },
      {
        field: 'creditAmount',
        label: this.translate.instant('FINANCE.CREDIT'),
        pipe: 'number',
      },
      {
        field: 'description',
        label: this.translate.instant('FINANCE.DESCRIPTION'),
      },
    ];
  }

  ngOnInit(): void {
    // ✅ ابنِ الـ form أولاً
    this.transactionFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: [''],
      transactionTypeId: ['', Validators.required],
      transactionDate: [getSystemNow(), Validators.required],
      isOpeningTransaction: [false],
      transactionEntries: [
        [],
        {
          validators: [
            this.transactionEntriesTotalValidator(),
            this.transactionEntriesValidator(),
            this.transactionEntriesMissingEntryTypeValidator(),
          ],
        },
      ],
      isFrontal: [this.isFrontal],
    });

    // رسالة تنبيه عند اختيار قيد افتتاحي
    this.transactionFormGroup
      .get('isOpeningTransaction')
      ?.valueChanges.subscribe((isOpening) => {
        if (isOpening) {
          this.messageService.add({
            severity: 'info',
            summary: this.activeLanguage === 'ar' ? 'معلومة' : 'Information',
            detail:
              this.activeLanguage === 'ar'
                ? 'يمكن إنشاء قيد افتتاحي واحد فقط لكل سنة'
                : 'Only one opening transaction can be created per year',
            life: 5000,
          });
        }
      });

    // ترجمة PrimeNG لو العربية
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    // ✅ بعد بناء الـ form حمّل البيانات
    this.loadData();

    // Subscribe to route parameter changes for navigation
    this.routeSubscription = this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId && newId !== this.transactionId) {
        this.transactionId = newId;
        this.loadTransaction(newId);
        this.updateNavigationControls();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  print() {
    window.print();
  }

  transactionEntriesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const transactionEntries = control.value;
      if (transactionEntries.length < 2) {
        return {
          minLength: {
            requiredLength: 2,
            actualLength: transactionEntries.length,
          },
        };
      }
      return null;
    };
  }

  transactionEntriesTotalValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const transactionEntries = control.value;
      // Sum of debit and credit amounts
      const debitAmount = transactionEntries
        .map((x) => x.debitAmount)
        .reduce((acc, val) => acc + val, 0);

      const creditAmount = transactionEntries
        .map((x) => x.creditAmount)
        .reduce((acc, val) => acc + val, 0);

      if (debitAmount !== creditAmount) {
        return {
          balanceMismatch: {
            debitAmount: debitAmount,
            creditAmount: creditAmount,
          },
        };
      }
      return null;
    };
  }

  transactionEntriesMissingEntryTypeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const transactionEntries = control.value;
      // Ensure there is at least one debit and one credit entry
      const hasDebitEntry = transactionEntries.some((x) => x.debitAmount > 0);
      const hasCreditEntry = transactionEntries.some((x) => x.creditAmount > 0);

      if (!hasDebitEntry || !hasCreditEntry) {
        return {
          missingEntryType: {
            hasDebitEntry: hasDebitEntry,
            hasCreditEntry: hasCreditEntry,
          },
        };
      }
      return null;
    };
  }

  loadData(): void {
    this.loading = true;
    const transactionId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!transactionId;

    forkJoin({
      transactionTypes: this.transactionTypeService.getAll(),
      mainAccounts: this.mainAccountService.getLookup(),
    }).subscribe({
      next: ({ transactionTypes, mainAccounts }) => {
        // أنواع القيود
        this.transactionTypesOptions = transactionTypes.map(
          (transactionType) => {
            // اضبط النوع الافتراضي "قيد يوميه" إن وجد
            if (
              transactionType.arabicName === 'قيد يوميه' ||
              transactionType.englishName === 'Transaction'
            ) {
              this.transactionFormGroup.controls.transactionTypeId.setValue(
                transactionType.id
              );
            }
            return {
              label:
                this.activeLanguage === 'en'
                  ? transactionType.englishName
                  : transactionType.arabicName,
              value: transactionType.id,
            };
          }
        );

        // الحسابات الرئيسية
        this.mainAccounts = mainAccounts;
        this.mainAccountsOptions = mainAccounts.map((mainAccount) => ({
          label:
            this.activeLanguage === 'en'
              ? `${mainAccount.referenceCode} | ${mainAccount.englishName}`
              : `${mainAccount.referenceCode} | ${mainAccount.arabicName}`,
          value: mainAccount.id,
        }));

        // وضع التعديل (لو فيه :id)
        this.loadMode();

        // ✅ وضع النسخ ?copyId=xxxx (لا يشتغل لو في وضع التعديل)
        this.initCopyMode();

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
    this.transactionId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.transactionId;
    if (this.isEditMode) {
      this.loadTransaction(this.transactionId);
      this.loadCompanyDetails();
      this.loadAllTransactionIds(); // Load IDs for navigation
    }
  }
  /** copy mode: ?copyId=xxxx */
  private initCopyMode(): void {
    // لا ننفذ وضع النسخ إذا كنا في وضع التعديل (:id موجود)
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) return;

    const copyId = this.route.snapshot.queryParamMap.get('copyId');
    if (!copyId) return;

    // نظّف أي سياق سابق
    this.isEditMode = false;
    this.transactionId = null;
    this.currentTransaction = null;
    this.isReadOnly = false;

    this.transactionService.getById(copyId).subscribe({
      next: (src: TransactionModel) => {
        // جهّز نسخة نظيفة
        const cloned = { ...src };

        // احذف/صفّر الحقول التي تربط القيد القديم بالسجلات
        cloned.id = null;
        cloned.referenceNumber = ''; // او اتركه null/'' حسب سياسة الترميز لديك
        cloned.transactionDate = null; // أو new Date() إذا أردت تاريخ اليوم
        cloned.isOpeningTransaction = false; // لا نسمح بنسخ قيد افتتاحي كـ افتتاحي جديد
        cloned.isFrontal = this.isFrontal; // ثبّت سياق الواجهة الحالية

        // اجهّز قيود اليومية المنسوخة بدون روابط
        const clonedEntries: TransactionEntryModel[] = (
          src.transactionEntries || []
        ).map((e) => {
          const ne = new TransactionEntryModel();
          ne.id = null;
          ne.transactionId = null;
          ne.mainAccountId = e.mainAccountId;
          ne.debitAmount = e.debitAmount || 0;
          ne.creditAmount = e.creditAmount || 0;
          ne.description = e.description || null;
          return ne;
        });

        // عبّي النموذج
        this.transactionFormGroup.patchValue({
          id: null,
          referenceNumber: cloned.referenceNumber,
          description: cloned.description,
          transactionTypeId:
            this.transactionFormGroup.get('transactionTypeId')?.value ||
            src.transactionTypeId,
          transactionDate: cloned.transactionDate, // null أو تاريخ اليوم … حسب تفضيلك
          isOpeningTransaction: cloned.isOpeningTransaction,
          transactionEntries: clonedEntries,
          isFrontal: this.isFrontal,
        });

        // عبّي جدول القيود القابل للتعديل
        // (نفس الطريقة المستخدمة عند تحميل القيد في وضع التعديل)
        if (this.transactionEntriesTable) {
          this.transactionEntriesTable.patchValues(clonedEntries);
        }

        // بيانات الطباعة (اختياري)
        this.docData = clonedEntries.map((entry: TransactionEntryModel) => ({
          ...entry,
          mainAccountName:
            this.activeLanguage === 'en'
              ? entry?.mainAccount?.englishName
              : entry?.mainAccount?.arabicName,
        }));

        // رسالة لطيفة
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.INFO'),
          detail:
            this.activeLanguage === 'ar'
              ? 'تم تحميل نسخة من القيد. قم بمراجعتها واحفظها كقيد جديد.'
              : 'A copy of the transaction has been loaded. Review and save as a new entry.',
        });
      },
      error: (err) => {
        console.error('Error loading source transaction for copy', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.TRANSACTION_LOADING_ERROR'),
        });
      },
    });
  }

  loadTransaction(id: string) {
    this.transactionService.getById(id).subscribe({
      next: (transaction) => {
        if (
          transaction.saleInvoiceId ||
          transaction.purchaseInvoiceId ||
          transaction.salesReturnId ||
          transaction.purchaseReturnId ||
          transaction.paycheckReceiptId ||
          transaction.paymentReceiptId ||
          transaction.inventoryPermitId ||
          transaction.inventoryStocktakingId ||
          transaction.reservationId ||
          transaction.debitNoteId ||
          transaction.creditNoteId
        ) {
          this.isReadOnly = true;
        }
        this.currentTransaction = transaction;

        this.docData = transaction.transactionEntries.map(
          (entry: TransactionEntryModel) => ({
            ...entry,
            mainAccountName:
              this.activeLanguage == 'en'
                ? entry.mainAccount.englishName
                : entry.mainAccount.arabicName,
          })
        );

        // Convert transactionDate to Date object for p-calendar
        let transactionDateValue: Date;
        if (typeof transaction.transactionDate === 'string') {
          transactionDateValue = new Date(transaction.transactionDate);
        } else {
          transactionDateValue = transaction.transactionDate instanceof Date
            ? transaction.transactionDate
            : new Date(transaction.transactionDate);
        }

        this.transactionFormGroup.patchValue({
          ...transaction,
          transactionDate: transactionDateValue,
        });
        this.transactionEntriesTable.patchValues(
          transaction.transactionEntries
        );

        // Setup custom buttons after loading transaction
        this.setupCustomButtons();
        this.updateNavigationControls();
      },
      error: (error) => {
        console.log('Error Loading Transaction', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.TRANSACTION_LOADING_ERROR'),
        });
      },
    });
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (!!this.userPermissions && this.userPermissions.some((x) => x.name === permission));
  }

  isSubmitted: boolean = false;

  saveTransaction(isSaveAndContinue: boolean = false) {
    this.isSubmitted = true;
    this.loading = true;
    const transactionEntries = this.transactionEntriesTable.getTableFormValue();
    this.transactionFormGroup.controls.transactionEntries.setValue(
      transactionEntries.map((x) => ({
        ...x,
        transactionId: x.transactionId || this.transactionId || null,
      }))
    );
    if (this.transactionFormGroup.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.TRANSACTIONS_SAVING_ERROR'),
      });
      this.loading = false;
      return;
    }
    // Access the rows value from the child component
    const transactionValues = this.transactionFormGroup.value;
    console.log('transactionValues', transactionValues);
    if (transactionValues.id) {
      const transaction = new TransactionModel();
      transaction.id = transactionValues.id;
      transaction.referenceNumber = transactionValues.referenceNumber;
      transaction.description = transactionValues.description;
      transaction.transactionDate =
        typeof transactionValues.transactionDate === 'string'
          ? formatDateOnlyToString(
            parseDateOnly(transactionValues.transactionDate)
          )
          : formatDateOnlyToString(transactionValues.transactionDate);
      transaction.transactionTypeId = transactionValues.transactionTypeId;
      transaction.isOpeningTransaction = transactionValues.isOpeningTransaction;
      transaction.transactionEntries = transactionValues.transactionEntries;
      transaction.isFrontal = transactionValues.isFrontal;
      this.transactionService.update(transaction).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.TRANSACTION_UPDATED'),
          });

          if (isSaveAndContinue && !this.isEditMode) {
            // Reset form for new entry
            this.resetFormForNewEntry();
          } else {
            // Navigate to list
            this.loading = false;
            if (this.isFrontal) {
              this.router.navigate(['/accounting/frontal-journal-transactions']);
            } else {
              this.router.navigate(['/accounting/journal-transactions']);
            }
          }
        },
        error: (error) => {
          console.log('Error Saving Transaction', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.TRANSACTIONS_SAVING_ERROR'),
          });
          this.loading = false;
        },
      });
    } else {
      const transaction = new TransactionModel();
      transaction.referenceNumber = transactionValues.referenceNumber;
      transaction.description = transactionValues.description;
      transaction.transactionTypeId = transactionValues.transactionTypeId;
      transaction.isOpeningTransaction = transactionValues.isOpeningTransaction;

      transaction.transactionDate =
        typeof transactionValues.transactionDate === 'string'
          ? formatDateOnlyToString(
            parseDateOnly(transactionValues.transactionDate)
          )
          : formatDateOnlyToString(transactionValues.transactionDate);

      transaction.transactionEntries = transactionValues.transactionEntries;
      transaction.isFrontal = this.isFrontal;

      this.transactionService.create(transaction).subscribe({
        next: (res) => {
          console.log('Transaction Saved', res);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.TRANSACTION_CREATED'),
          });

          if (isSaveAndContinue) {
            // Reset form for new entry
            this.resetFormForNewEntry();
          } else {
            // Navigate to list
            this.loading = false;
            if (this.isFrontal) {
              this.router.navigate(['/accounting/frontal-journal-transactions']);
            } else {
              this.router.navigate(['/accounting/journal-transactions']);
            }
          }
        },
        error: (error) => {
          console.log('Error Saving Transaction', error);

          let errorMessage = this.translate.instant(
            'FINANCE.TRANSACTIONS_SAVING_ERROR'
          );

          // Check if it's a server error (500) - handle different error formats
          const isServerError =
            error.status === 500 ||
            error.statusText === 'Internal Server Error' ||
            (typeof error === 'string' &&
              error.includes('Internal Server Error'));

          if (isServerError) {
            const isOpeningTransaction = this.transactionFormGroup.get(
              'isOpeningTransaction'
            )?.value;

            if (isOpeningTransaction === true) {
              errorMessage =
                this.activeLanguage === 'ar'
                  ? 'لا يمكن إنشاء قيد افتتاحي آخر. يوجد بالفعل قيد افتتاحي لهذه السنة.'
                  : 'Cannot create another opening transaction. An opening transaction already exists for this year.';
            } else {
              errorMessage =
                this.activeLanguage === 'ar'
                  ? 'خطأ في القيد اليومي. يرجى التحقق من البيانات المدخلة أو الاتصال بالدعم الفني.'
                  : 'Journal entry error. Please check your data or contact technical support.';
            }
          }

          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: errorMessage,
          });
          this.loading = false;
        },
      });
    }
  }

  addTransactionEntry(transactionEntry: TransactionEntryModel) {
    if (
      transactionEntry.creditAmount === 0 &&
      transactionEntry.debitAmount === 0
    ) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant(
          'FINANCE.DEBIT_REQUIRED_OR_CREDIT_REQUIRED'
        ),
      });
    } else {
      this.transactionFormGroup.controls.transactionEntries.setValue([
        ...this.transactionFormGroup.controls.transactionEntries.value,
        transactionEntry,
      ]);
    }
  }

  navigateToTransactionsPage() {
    if (this.isFrontal) {
      this.router.navigate(['/accounting/frontal-journal-transactions']);
    } else {
      this.router.navigate(['/accounting/journal-transactions']);
    }
  }

  currentTransaction: TransactionModel = null;

  hasSourceDocument(): boolean {
    return !!(
      this.currentTransaction &&
      (this.currentTransaction.saleInvoiceId ||
        this.currentTransaction.purchaseInvoiceId ||
        this.currentTransaction.paymentReceiptId ||
        this.currentTransaction.paycheckReceiptId ||
        this.currentTransaction.salesReturnId ||
        this.currentTransaction.purchaseReturnId ||
        this.currentTransaction.inventoryPermitId ||
        this.currentTransaction.inventoryStocktakingId ||
        this.currentTransaction.reservationId ||
        this.currentTransaction.debitNoteId ||
        this.currentTransaction.creditNoteId)
    );
  }

  getSourceDocumentName(): string {
    if (!this.currentTransaction) return '';
    const isAr = this.activeLanguage === 'ar';
    if (this.currentTransaction.saleInvoiceId) return isAr ? 'فاتورة المبيعات' : 'Sales Invoice';
    if (this.currentTransaction.purchaseInvoiceId) return isAr ? 'فاتورة المشتريات' : 'Purchase Invoice';
    if (this.currentTransaction.salesReturnId) return isAr ? 'مرتجع المبيعات' : 'Sales Return';
    if (this.currentTransaction.purchaseReturnId) return isAr ? 'مرتجع المشتريات' : 'Purchase Return';
    if (this.currentTransaction.paymentReceiptId) return isAr ? 'سند الصرف' : 'Payment Voucher';
    if (this.currentTransaction.paycheckReceiptId) return isAr ? 'سند القبض' : 'Receipt Voucher';
    if (this.currentTransaction.inventoryPermitId) return isAr ? 'الإذن المخزني' : 'Inventory Permit';
    if (this.currentTransaction.inventoryStocktakingId) return isAr ? 'الجرد المخزني' : 'Inventory Stocktaking';
    if (this.currentTransaction.reservationId) return isAr ? 'الحجز' : 'Reservation';
    if (this.currentTransaction.debitNoteId) return isAr ? 'الإشعار المدين' : 'Debit Note';
    if (this.currentTransaction.creditNoteId) return isAr ? 'الإشعار الدائن' : 'Credit Note';
    return isAr ? 'المستند الأصلي' : 'Source Document';
  }

  goToSourceDocument() {
    if (!this.currentTransaction) return;
    let path = '';
    if (this.currentTransaction.saleInvoiceId) {
      path = `/invoices/${this.currentTransaction.saleInvoiceId}`;
    } else if (this.currentTransaction.purchaseInvoiceId) {
      path = `/purchase-invoices/${this.currentTransaction.purchaseInvoiceId}`;
    } else if (this.currentTransaction.salesReturnId) {
      path = `/sales-returns/${this.currentTransaction.salesReturnId}`;
    } else if (this.currentTransaction.purchaseReturnId) {
      path = `/purchase-returns/${this.currentTransaction.purchaseReturnId}`;
    } else if (this.currentTransaction.paymentReceiptId) {
      path = `/receipts/payment-receipts/${this.currentTransaction.paymentReceiptId}`;
    } else if (this.currentTransaction.paycheckReceiptId) {
      path = `/receipts/paycheck-receipts/${this.currentTransaction.paycheckReceiptId}`;
    } else if (this.currentTransaction.inventoryPermitId) {
      path = `/permits/${this.currentTransaction.inventoryPermitId}`;
    } else if (this.currentTransaction.inventoryStocktakingId) {
      path = `/inventory-stocktaking/${this.currentTransaction.inventoryStocktakingId}`;
    } else if (this.currentTransaction.reservationId) {
      path = `/reservations/${this.currentTransaction.reservationId}`;
    } else if (this.currentTransaction.debitNoteId) {
      path = `/notes/debit-notes/${this.currentTransaction.debitNoteId}`;
    } else if (this.currentTransaction.creditNoteId) {
      path = `/notes/sales-credit-notes/${this.currentTransaction.creditNoteId}`;
    }

    if (path) {
      const url = this.router.serializeUrl(this.router.createUrlTree([path]));
      window.open(url, '_blank');
    }
  }

  goToInvoice() {
    this.goToSourceDocument();
  }

  goToReceipt() {
    this.goToSourceDocument();
  }

  canDeleteTransaction(): boolean {
    if (!this.isEditMode || !this.currentTransaction) return false;
    if (this.currentTransaction.isActive === false) return false;
    return !(
      this.currentTransaction.saleInvoiceId ||
      this.currentTransaction.purchaseInvoiceId ||
      this.currentTransaction.salesReturnId ||
      this.currentTransaction.purchaseReturnId ||
      this.currentTransaction.paymentReceiptId ||
      this.currentTransaction.paycheckReceiptId ||
      this.currentTransaction.inventoryPermitId ||
      this.currentTransaction.inventoryStocktakingId ||
      this.currentTransaction.reservationId ||
      this.currentTransaction.debitNoteId ||
      this.currentTransaction.creditNoteId
    );
  }

  getDeleteDisableTooltip(): string {
    if (this.currentTransaction?.isActive === false) {
      return this.activeLanguage === 'ar' ? 'القيد محذوف بالفعل' : 'Transaction is already deleted';
    }
    return this.activeLanguage === 'ar'
      ? 'لا يمكن حذف القيد لأنه مرتبط بمستند أصلي (فاتورة / سند)'
      : 'Cannot delete transaction because it is linked to another document';
  }

  confirmTransactionDeletion(event: Event) {
    if (!this.canDeleteTransaction()) return;
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_TRANSACTION_DELETE', {
        referenceNumber: this.currentTransaction.referenceNumber,
      }),
      header: this.translate.instant('FINANCE.TRANSACTION_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md',
      rejectButtonStyleClass: 'p-button-text rounded-md',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteCurrentTransaction();
      },
    });
  }

  deleteCurrentTransaction() {
    if (!this.currentTransaction?.id) return;
    this.loading = true;
    this.transactionService.delete(this.currentTransaction.id).subscribe({
      next: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.TRANSACTION_MARKED_DELETED'),
        });
        this.navigateToTransactionsPage();
      },
      error: (err) => {
        this.loading = false;
        console.error('Delete transaction error:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.TRANSACTION_DELETE_ERROR'),
        });
      },
    });
  }

  loadCompanyDetails() {
    this.companyDetailsService.getAll().subscribe({
      next: (value) => {
        this.companyDetails = value[0];
      },
      error(err) {
        console.error('Error loading Company details', err);
      },
    });
  }

  get attachments(): AttachmentModel[] {
    return this.currentTransaction?.attachments || [];
  }
  loadAttachments() {
    this.loadMode();
  }

  calculateTransactionTotalCredit(entries: TransactionEntryModel[]) {
    return entries.reduce((acc, val) => acc + val.creditAmount, 0);
  }
  calculateTransactionTotalDebit(entries: TransactionEntryModel[]) {
    return entries.reduce((acc, val) => acc + val.debitAmount, 0);
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

  confirmAttachmentDeletion(event: Event, attachment: AttachmentModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_ATTACHMENT_DELETE'),
      header: this.translate.instant('FINANCE.ATTACHMENT_DELETE_CONFIRMATION', {
        referenceNumber: attachment.referenceNumber,
      }),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteAttachment(attachment.id);
      },
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
    const transactionId = this.route.snapshot.paramMap.get('id');
    if (!transactionId) return;
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
      requestData.transactionId = transactionId;
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
    const transactionId = this.route.snapshot.paramMap.get('id');
    if (!transactionId) return;
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
      requestData.transactionId = transactionId;
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

  // ============= Actions Menu Methods =============

  // Setup custom buttons for actions menu
  setupCustomButtons(): void {
    this.customButtons = [];

    if (this.isEditMode && this.currentTransaction) {
      // Copy button - always available in edit mode
      this.customButtons.push({
        label: 'COMMON.COPY',
        icon: 'pi pi-copy',
        color: 'info',
        action: () => this.copyTransaction(),
        visible: true
      });

      // Send to Frontal button - HIDDEN for now due to technical issues
      // if (!this.currentTransaction.isFrontal) {
      //   this.customButtons.push({
      //     label: 'FINANCE.SEND_TO_FRONTAL',
      //     icon: 'pi pi-send',
      //     color: 'primary',
      //     action: () => this.sendToFrontal(),
      //     visible: true
      //   });
      // } else {
      //   // Show status if already sent to frontal
      //   this.customButtons.push({
      //     label: 'FINANCE.SENT_TO_FRONTAL',
      //     icon: 'pi pi-check',
      //     color: 'success',
      //     action: () => this.showFrontalStatus(),
      //     visible: true
      //   });
      // }
    }
  }

  // Copy transaction functionality
  copyTransaction(): void {
    const targetId = this.transactionId || (this.currentTransaction ? this.currentTransaction.id : null);
    if (!targetId) return;
    const targetRoute = this.isFrontal
      ? '/accounting/frontal-journal-transactions/transaction'
      : '/accounting/journal-transactions/transaction';
    this.router.navigate([targetRoute], {
      queryParams: { copyId: targetId }
    });
  }

  // Print transaction functionality
  onPrintClick(): void {
    this.printDocument();
  }

  // Send to frontal functionality
  sendToFrontal(): void {
    if (!this.currentTransaction) return;

    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_SEND_TO_FRONTAL'),
      header: this.translate.instant('FINANCE.SEND_TO_FRONTAL_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-primary p-button-text rounded-md",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.executeTransferToFrontal();
      }
    });
  }

  // Execute the transfer to frontal
  executeTransferToFrontal(): void {
    // Create a proper TransactionModel instance
    const updatedTransaction = new TransactionModel();
    updatedTransaction.id = this.currentTransaction.id;
    updatedTransaction.referenceNumber = this.currentTransaction.referenceNumber;
    updatedTransaction.description = this.currentTransaction.description;
    updatedTransaction.transactionDate = this.currentTransaction.transactionDate;
    updatedTransaction.transactionTypeId = this.currentTransaction.transactionTypeId;
    updatedTransaction.isOpeningTransaction = this.currentTransaction.isOpeningTransaction;
    updatedTransaction.transactionEntries = this.currentTransaction.transactionEntries;
    updatedTransaction.isFrontal = true; // This is the key change

    this.transactionService.update(updatedTransaction).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.TRANSACTION_SENT_TO_FRONTAL')
        });

        // Update current transaction in memory to avoid unnecessary reload
        this.currentTransaction.isFrontal = true;

        // Update custom buttons to reflect new status using zone.run to isolate change detection
        this.setupCustomButtons();
      },
      error: (error) => {
        console.error('Error sending transaction to frontal', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.SEND_TO_FRONTAL_ERROR')
        });
      }
    });
  }

  // Show frontal status
  showFrontalStatus(): void {
    this.messageService.add({
      severity: 'info',
      summary: this.translate.instant('FINANCE.INFO'),
      detail: this.translate.instant('FINANCE.TRANSACTION_ALREADY_IN_FRONTAL')
    });
  }

  // ============= Navigation Methods =============

  // Load all transaction IDs for navigation
  loadAllTransactionIds(): void {
    this.transactionService.getTransactionsPaged(1, 50).subscribe({
      next: (res) => {
        const transactions = res?.data || [];
        console.log('Loaded transactions for navigation:', transactions.length);
        this.allTransactionIds = transactions.map(transaction => transaction.id);
        console.log('Transaction IDs:', this.allTransactionIds);
        this.updateNavigationControls();
      },
      error: (err) => {
        console.error('Error loading transaction IDs', err);
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    console.log('updateNavigationControls called with:', {
      transactionId: this.transactionId,
      allTransactionIdsLength: this.allTransactionIds.length
    });

    if (!this.transactionId || this.allTransactionIds.length === 0) {
      console.log('Navigation controls set to undefined');
      this.navigationControls = undefined;
      return;
    }

    this.currentIndex = this.allTransactionIds.indexOf(this.transactionId);
    console.log('Current index:', this.currentIndex);

    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allTransactionIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
      console.log('Navigation controls set:', this.navigationControls);
    } else {
      console.log('Transaction ID not found in allTransactionIds');
      this.navigationControls = undefined;
    }
  }

  // Navigate to next transaction
  navigateToNext(): void {
    if (this.currentIndex < this.allTransactionIds.length - 1) {
      const nextId = this.allTransactionIds[this.currentIndex + 1];
      this.router.navigate(['/accounting/journal-transactions/transaction', nextId]);
    }
  }

  // Navigate to previous transaction
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allTransactionIds[this.currentIndex - 1];
      this.router.navigate(['/accounting/journal-transactions/transaction', prevId]);
    }
  }

  // Reset form for creating a new entry (Save and Continue functionality)
  resetFormForNewEntry(): void {
    // Reset loading and submission states first
    this.loading = false;
    this.isSubmitted = false;

    // Reset form to initial state but preserve structure
    this.transactionFormGroup.reset({
      id: [null],
      referenceNumber: [''],
      description: [''],
      transactionTypeId: [''],
      transactionDate: [getSystemNow()],
      isOpeningTransaction: [false],
      transactionEntries: [[]],
      isFrontal: [this.isFrontal]
    });

    // Set default transaction type if available
    const defaultTransactionType = this.transactionTypesOptions.find(
      option => option.label.includes('قيد يوميه') || option.label.includes('Transaction')
    );
    if (defaultTransactionType) {
      this.transactionFormGroup.get('transactionTypeId')?.setValue(defaultTransactionType.value);
    }

    // Clear and reset the entries table safely
    if (this.transactionEntriesTable) {
      try {
        this.transactionEntriesTable.clearEmptyRows();
        this.transactionEntriesTable.patchValues([]);
      } catch (error) {
        console.log('Table reset error (safe to ignore):', error);
      }
    }

    // Reset current transaction
    this.currentTransaction = null;

    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
