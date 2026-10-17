import { CommonModule } from '@angular/common';
import { Component, ElementRef, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import { TabViewModule } from 'primeng/tabview';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import * as FileSaver from 'file-saver';
import { Treasury } from 'src/app/models/treasury/treasury';
import { TreasuryService } from 'src/app/services/treasury/treasury.service';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { Router, ActivatedRoute } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { GeneralBankAccount, ImportFailure, ImportResult } from 'src/app/services/treasury/treasury.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { formatImportErrorMessage } from 'src/app/shared/utils/import-error-message';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

// interface GeneralBankAccount {
//   id: string;
//   accountName: string;
//   bankName: string;
//   iban: string;
//   isActive: boolean;
//   createdAt: Date | null;
// }

/** DTO الخاص بطلب الإضافة (POST) */
type CreateGeneralBankAccountDto = {
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  bankBranchName: string;
  swiftCode: string;
  iban: string;
  mainAccountId: string;
  isFrontal: boolean;
  isActive: boolean; 
};

@Component({
  selector: 'app-treasuries',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TreeModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ConfirmDialogModule,
    TagModule,
    ToastModule,
    TableModule,
    DropdownModule,
    MultiSelectModule,
    ProgressBarModule,
    InputNumberModule,
    TranslateModule,
    FormsModule,
    PaginatorModule,
    OverlayPanelModule,
    TabViewModule,
    CustomDatePipe,
    InputSwitchModule,
  ],
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
  templateUrl: './treasuries.component.html',
  styleUrl: './treasuries.component.scss',
})
export class TreasuryComponent implements OnInit {
  importInstructionsVisibleSignal = signal(false);
  get importInstructionsVisible() {
    return this.importInstructionsVisibleSignal();
  }
  set importInstructionsVisible(value: boolean) {
    this.importInstructionsVisibleSignal.set(value);
  }

  importResultVisibleSignal = signal(false);
  get importResultVisible() {
    return this.importResultVisibleSignal();
  }
  set importResultVisible(value: boolean) {
    this.importResultVisibleSignal.set(value);
  }

  importTargetSignal = signal<'treasury' | 'bank'>('treasury');
  get importTarget() {
    return this.importTargetSignal();
  }
  set importTarget(value: 'treasury' | 'bank') {
    this.importTargetSignal.set(value);
  }

  importInProgressSignal = signal(false);
  get importInProgress() {
    return this.importInProgressSignal();
  }
  set importInProgress(value: boolean) {
    this.importInProgressSignal.set(value);
  }

  importProgressSignal = signal(0);
  get importProgress() {
    return this.importProgressSignal();
  }
  set importProgress(value: number) {
    this.importProgressSignal.set(value);
  }

  importResultSignal = signal<ImportResult>({ imported: 0, updated: 0, failed: [] });
  get importResult() {
    return this.importResultSignal();
  }
  set importResult(value: ImportResult) {
    this.importResultSignal.set(value);
  }

  @ViewChild('treasuryImportFileInput') treasuryImportFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bankImportFileInput') bankImportFileInput!: ElementRef<HTMLInputElement>;

  onAddBankAccount() {
    this.selectedBankForOverlay = null;
    this.bankAccountForm.reset();  // reset كل حاجة
    this.bankAccountForm.patchValue({
      accountName: '',
      bankName: '',
      bankBranchName: '',
      bankAccountNumber: '',
      swiftCode: '',
      iban: '',
      mainAccountId: null,
      isActive: true,   
      isFrontal: false   // الافتراضي: مش فرونتال
    });
    
    this.bankDialogVisibleSignal.set(true);
  }
  
 
  editBankAccount(row: any) {
    if (this.opBankPanel?.overlayVisible) {
      this.opBankPanel.hide();
    }
    this.loadingBank = true;
  
    this.treasuryService.getGeneralBankAccountById(row.id).subscribe({
      next: (res) => {
        this.bankAccountForm.patchValue({
          accountName: res.accountName,
          bankName: res.bankName,
          bankBranchName: res.bankBranchName,
          bankAccountNumber: res.bankAccountNumber,
          swiftCode: res.swiftCode,
          iban: res.iban,
          mainAccountId: res.mainAccountId,
          isActive: true,  
          isFrontal: res.isFrontal,   // ✅ لازم يتملأ من الـ API
        });
  
        this.selectedBankForOverlay = res;
        this.bankDialogVisibleSignal.set(true);
        this.loadingBank = false;
      },
      error: (err) => {
        console.error('Error loading GeneralBankAccount by id', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.BANK_ACCOUNT_LOADING_ERROR'),
        });
        this.loadingBank = false;
      },
    });
  }
  
  

  bankDialogVisibleSignal = signal(false);
  bankAccountForm!: FormGroup;
  activeTabIndex = 0;
  viewMode: 'treasury' | 'bank' | 'tab' = 'treasury';
  // ---------- Treasuries ----------
  treasuriesSignal = signal<any[]>([]);
  get treasuries() {
    return this.treasuriesSignal();
  }
  set treasuries(value) {
    this.treasuriesSignal.set(value);
  }

  loading: boolean = true;

  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal();
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  treasuryVisibleDialogSignal = signal(false);
  get treasuryVisibleDialogVisible() {
    return this.treasuryVisibleDialogSignal();
  }
  set treasuryVisibleDialogVisible(value) {
    this.treasuryVisibleDialogSignal.set(value);
  }

  treasuryFormGroup: FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  // ---------- General Bank Accounts (Tab 2) ----------
  generalBankAccountsSignal = signal<GeneralBankAccount[]>([]);
  get generalBankAccounts() {
    return this.generalBankAccountsSignal();
  }
  set generalBankAccounts(value) {
    this.generalBankAccountsSignal.set(value);
  }
  viewBankDialogVisible = false; 
  selectedBankForView: GeneralBankAccount | null = null;
  
  viewBankAccount(row: GeneralBankAccount) {
    if (this.opBankPanel?.overlayVisible) {
      this.opBankPanel.hide();
    }
    this.selectedBankForView = row;
    this.viewBankDialogVisible = true;
  }
  
  closeViewBankDialog() {
    this.viewBankDialogVisible = false;
    this.selectedBankForView = null;
  }
  
  loadingBank = false;
  searchBankSignal = signal('');
  get searchBank() {
    return this.searchBankSignal();
  }
  set searchBank(v) {
    this.searchBankSignal.set(v);
  }

  bankColumns!: Column[];

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public treasuryService: TreasuryService,
    public detailAccountService: DetailAccountService,
    public mainAccountService: MainAccountService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');
    if (this.router.url.includes('bank')) {
      this.viewMode = 'bank';
      this.activeTabIndex = 1;
    } else if (this.router.url.includes('treasur')) {
      this.viewMode = 'treasury';
      this.activeTabIndex = 0;
    } else {
      this.viewMode = 'tab';
    }

    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userPermissions = res.userRoles
          .map((ur) => ur.role.rolePermissions.map((rp) => rp.permission))
          .reduce((acc, val) => acc.concat(val), []);
      }
    });

    this.treasuryFormGroup = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
      mainAccountId: [null, Validators.required],
      isFrontal: [this.isFrontal],
    });
    this.bankAccountForm = this.fb.group({
      accountName: ['', Validators.required],
      bankName: ['', Validators.required],
      bankBranchName: [''],
      bankAccountNumber: ['', Validators.required],
      swiftCode: [''],
      iban: ['', Validators.required],
      mainAccountId: [null, Validators.required],
      isActive: [true],      
      isFrontal: [false],
    });
    
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.initColumns();
  }

  initColumns() {
    this.columns = [
      { field: 'name', header: 'FINANCE.NAME', filter: true, filterType: 'text' },
      { field: 'isConnected', header: 'FINANCE.IS_CONNECTED', filter: true, filterType: 'text' },
      { field: 'createdAt', header: 'FINANCE.CREATED_AT', filter: true, filterType: 'date' },
    ];

    this.bankColumns = [
      { field: 'accountName', header: 'FINANCE.ACCOUNT_NAME_LABEL', filter: true, filterType: 'text' },
      { field: 'bankName', header: 'FINANCE.BANK_NAME_LABEL', filter: true, filterType: 'text' },
      { field: 'iban', header: 'FINANCE.IBAN_LABEL', filter: true, filterType: 'text' },
      { field: 'isActive', header: 'FINANCE.ACTIVE_LABEL', filter: true, filterType: 'text' },
      { field: 'createdAt', header: 'FINANCE.CREATED_AT', filter: true, filterType: 'date' },
    ];
  }

  ngOnInit(): void {
    this.initColumns();
    this.translate.onLangChange.subscribe((event) => {
      this.activeLanguage = event.lang;
      if (this.activeLanguage === 'ar') {
        this.primengConfig.setTranslation(primengArTranslations);
      }
      this.initColumns();
    });

    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['tab']) {
        this.activeTabIndex = +params['tab'];
      }
      if (params['action'] === 'addTreasury') {
        this.showAddTreasuryDialog();
      }
      if (params['action'] === 'addBank') {
        this.onAddBankAccount();
      }
    });

    this.loadTreasury();
    this.loadMainAccounts();
    this.loadGeneralBankAccounts();
  }

  openTreasuryImportInstructions() {
    this.importTarget = 'treasury';
    this.importInstructionsVisible = true;
  }

  openBankImportInstructions() {
    this.importTarget = 'bank';
    this.importInstructionsVisible = true;
  }

  triggerImportFileSelection() {
    if (this.importTarget === 'treasury') {
      this.treasuryImportFileInput?.nativeElement?.click();
      return;
    }
    this.bankImportFileInput?.nativeElement?.click();
  }

  downloadTemplate() {
    const request$ = this.importTarget === 'treasury'
      ? this.treasuryService.downloadTemplate()
      : this.treasuryService.downloadGeneralBankAccountTemplate();
    const fileName = this.importTarget === 'treasury'
      ? 'treasuries-template.xlsx'
      : 'bankAccount-template.xlsx';

    request$.subscribe({
      next: (blob) => FileSaver.saveAs(blob, fileName),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
        });
      },
    });
  }

  onImportFileSelected(event: Event, target: 'treasury' | 'bank') {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('INVOICE.IMPORT_INVALID_FILE_TYPE'),
      });
      input.value = '';
      return;
    }

    this.importInstructionsVisible = false;
    this.importInProgress = true;
    this.importProgress = 25;
    this.importTarget = target;
    this.importResult = { imported: 0, updated: 0, failed: [] };

    const request$ =
      target === 'treasury'
        ? this.treasuryService.importTreasuriesFromExcel(file)
        : this.treasuryService.importGeneralBankAccountsFromExcel(file);

    request$.subscribe({
      next: (res) => {
        this.importProgress = 100;
        this.importResult = {
          imported: res?.imported ?? 0,
          updated: res?.updated ?? 0,
          failed: res?.failed ?? [],
        };
        this.importResultVisible = true;

        this.messageService.add({
          severity: this.importResult.failed.length ? 'warn' : 'success',
          summary: this.translate.instant(this.importResult.failed.length ? 'FINANCE.ERROR' : 'FINANCE.SUCCESS'),
          detail: this.translate.instant('INVOICE.IMPORT_RESULT_LINE', {
            imported: this.importResult.imported,
            updated: this.importResult.updated,
            failed: this.importResult.failed.length,
          }),
        });

        if (target === 'treasury') {
          this.loadTreasury();
        } else {
          this.loadGeneralBankAccounts();
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('INVOICE.IMPORT_FAILED_GENERIC'),
        });
      },
      complete: () => {
        this.importInProgress = false;
        this.importProgress = 0;
        input.value = '';
      },
    });
  }

  getImportHeaders(): string[] {
    if (this.importTarget === 'treasury') {
      return [
        this.translate.instant('FINANCE.TREASURY_IMPORT_HEADER_NAME'),
        this.translate.instant('FINANCE.TREASURY_IMPORT_HEADER_MAIN_ACCOUNT_ID'),
      ];
    }

    return [
      this.translate.instant('FINANCE.BANK_IMPORT_HEADER_ACCOUNT_NAME'),
      this.translate.instant('FINANCE.BANK_IMPORT_HEADER_BANK_NAME'),
      this.translate.instant('FINANCE.BANK_IMPORT_HEADER_BANK_ACCOUNT_NUMBER'),
      this.translate.instant('FINANCE.BANK_IMPORT_HEADER_BANK_BRANCH_NAME'),
      // this.translate.instant('FINANCE.BANK_IMPORT_HEADER_SWIFT_CODE'),
      this.translate.instant('FINANCE.BANK_IMPORT_HEADER_IBAN'),
      this.translate.instant('FINANCE.BANK_IMPORT_HEADER_MAIN_ACCOUNT_ID'),
      // this.translate.instant('FINANCE.BANK_IMPORT_HEADER_IS_ACTIVE'),
      // this.translate.instant('FINANCE.BANK_IMPORT_HEADER_IS_FRONTAL'),
    ];
  }

  getImportNotes(): string[] {
    if (this.importTarget === 'treasury') {
      return [
        this.translate.instant('FINANCE.TREASURY_IMPORT_NOTE_LANG_HEADERS'),
        this.translate.instant('FINANCE.TREASURY_IMPORT_NOTE_REQUIRED_NAME'),
        this.translate.instant('FINANCE.TREASURY_IMPORT_NOTE_NO_UPDATES'),
      ];
    }

    return [
      this.translate.instant('FINANCE.BANK_IMPORT_NOTE_LANG_HEADERS'),
      this.translate.instant('FINANCE.BANK_IMPORT_NOTE_REQUIRED_ACCOUNT_NAME'),
      this.translate.instant('FINANCE.BANK_IMPORT_NOTE_NO_UPDATES'),
    ];
  }

  getImportFailureReason(failure: ImportFailure): string {
    return formatImportErrorMessage(this.translate, failure);
  }

  // --------------- Main accounts dropdown ---------------
  mainAccountOptionsSignal = signal<any[]>([]);
  get mainAccountOptions() {
    return this.mainAccountOptionsSignal();
  }
  set mainAccountOptions(value) {
    this.mainAccountOptionsSignal.set(value);
  }

  loadMainAccounts() {
    this.mainAccountService.getAll().subscribe({
      next: (mainAccounts) => {
        this.mainAccountOptions = mainAccounts.map((x) => ({
          label:
            this.activeLanguage === 'en'
              ? `${x.englishName} | ${x.referenceCode}`
              : `${x.arabicName} | ${x.referenceCode}`,
          value: x.id,
        }));
      },
      error: (error) => {
        console.log('Error Loading Main Accounts', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_ACCOUNTS_LOADING_ERROR'),
        });
      },
    });
  }
// فتح قائمة الإجراءات (Overlay) لحساب بنكي
showBankOverlay(event: MouseEvent, row: GeneralBankAccount) {
  event.preventDefault();
  event.stopPropagation();
  
  const isVisible = this.opBankPanel.overlayVisible;
  const isDifferent = this.selectedBankForOverlay?.id !== row.id;
  this.selectedBankForOverlay = row;

  // Fix double-click issue
  if (isVisible && isDifferent) {
    this.opBankPanel.show(event);
  } else {
    this.opBankPanel.toggle(event);
  }

  // Position panel at mouse location
  setTimeout(() => {
    const panelEl = this.opBankPanel.container as HTMLElement;
    if (!panelEl) return;

    panelEl.style.position = 'fixed';
    panelEl.style.left = `${event.clientX}px`;
    panelEl.style.top = `${event.clientY}px`;
    panelEl.style.zIndex = '9999';
  });
}

// تأكيد الحذف ثم الاستدعاء الفعلي
confirmBankDeletion(event: Event, row: GeneralBankAccount) {
  if (this.opBankPanel?.overlayVisible) {
    this.opBankPanel.hide();
  }
  this.confirmationService.confirm({
    target: event.target as EventTarget,
    message: this.translate.instant('FINANCE.CONFIRM_BANK_ACCOUNT_DELETE', {
      accountName: row.accountName,
    }),
    header: this.translate.instant('FINANCE.BANK_ACCOUNT_DELETE_CONFIRMATION'),
    icon: 'pi pi-info-circle',
    acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md',
    rejectButtonStyleClass: 'p-button-text rounded-md',
    acceptIcon: 'none',
    rejectIcon: 'none',
    acceptLabel: this.translate.instant('FINANCE.YES'),
    rejectLabel: this.translate.instant('FINANCE.NO'),
    accept: () => this.deleteBankAccount(row.id),
  });
}

// استدعاء الـ API للحذف وتحديث الجدول
deleteBankAccount(id: string) {
  this.loadingBank = true;
  this.treasuryService.deleteGeneralBankAccount(id).subscribe({
    next: () => {
      this.generalBankAccounts = this.generalBankAccounts.filter(x => x.id !== id);
      this.loadingBank = false;
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: this.translate.instant('FINANCE.BANK_ACCOUNT_DELETED'),
      });
      if (this.opBankPanel?.overlayVisible) {
        this.opBankPanel.hide();
      }
    },
    error: (err) => {
      console.error('Error deleting GeneralBankAccount', err);
      this.loadingBank = false;
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.BANK_ACCOUNT_DELETING_ERROR'),
      });
    },
  });
}

  // --------------- Treasuries ---------------
  loadTreasury() {
    this.loading = true;
    if (this.isFrontal) {
      this.treasuryService.getAllFrontal().subscribe({
        next: (treasuries) => {
          this.treasuries = treasuries.map((x) => ({
            ...x,
            createdAt: new Date(x.createdAt),
            isConnected: !!x.mainAccountId,
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.TREASURIES_LOADING_ERROR'),
          });
        },
      });
    } else {
      this.treasuryService.getAll().subscribe({
        next: (treasuries) => {
          this.treasuries = treasuries.map((x) => ({
            ...x,
            createdAt: new Date(x.createdAt),
            isConnected: !!x.mainAccountId,
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.TREASURIES_LOADING_ERROR'),
          });
        },
      });
    }
  }

  showAddTreasuryDialog(treasury: Treasury = null) {
    if (this.opTreasuryPanel?.overlayVisible) {
      this.opTreasuryPanel.hide();
    }
    this.treasuryFormGroup.reset();
    if (treasury) {
      this.treasuryFormGroup.controls.id.setValue(treasury.id);
      this.treasuryFormGroup.controls.name.setValue(treasury.name);
      this.treasuryFormGroup.controls.mainAccountId.setValue(
        treasury.mainAccountId
      );
      this.treasuryFormGroup.controls.isFrontal.setValue(
        treasury.isFrontal || this.isFrontal
      );
    } else {
      this.treasuryFormGroup.controls.isFrontal.setValue(this.isFrontal);
    }
    this.treasuryVisibleDialogVisible = true;
  }

  closeTreasuryDialog() {
    this.treasuryVisibleDialogVisible = false;
    this.treasuryFormGroup.reset();
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some((x) => x.name === permission);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    this.searchValue = trimmedValue;
    dt1.filterGlobal(trimmedValue, 'contains');
  }

  saveTreasury() {
    if (this.treasuryFormGroup.invalid) {
      this.treasuryFormGroup.markAllAsTouched();
      return;
    }
    const treasuryValues = this.treasuryFormGroup.value;
    
    const trimmedName = treasuryValues.name.trim();
    const isDuplicate = this.treasuries.some(treasury => 
      treasury.name.toLowerCase() === trimmedName.toLowerCase() && 
      treasury.id !== treasuryValues.id
    );
    
    if (isDuplicate) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.TREASURY_NAME_ALREADY_EXISTS'),
      });
      return;
    }
    if (treasuryValues.id) {
      const treasury = new Treasury();
      treasury.id = treasuryValues.id;
      treasury.name = treasuryValues.name.trim();
      treasury.mainAccountId = treasuryValues.mainAccountId;
      treasury.isFrontal = treasuryValues.isFrontal;
      this.treasuryService.update(treasury).subscribe({
        next: () => {
          this.closeTreasuryDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.TREASURY_UPDATED'),
          });
          this.loadTreasury();
        },
        error: (error) => {
          console.log('Error Saving Customer Profile', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.TREASURY_SAVING_ERROR'),
          });
          this.closeTreasuryDialog();
        },
      });
    } else {
      const treasury = new Treasury();
      treasury.name = treasuryValues.name.trim();
      treasury.mainAccountId = treasuryValues.mainAccountId;
      treasury.isFrontal = treasuryValues.isFrontal;
      this.treasuryService.create(treasury).subscribe({
        next: () => {
          this.closeTreasuryDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.TREASURY_CREATED'),
          });
          this.loadTreasury();
        },
        error: (error: any) => {
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('FINANCE.TREASURY_SAVING_ERROR');
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: detailMsg,
          });
        },
      });
    }
  }

  deleteTreasury(treasury: Treasury) {
    this.treasuryService.delete(treasury.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.TREASURY_DELETED'),
        });
        this.loadTreasury();
      },
      error: (error) => {
        console.log('Error Deleting Room Type', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.TREASURY_DELETING_ERROR'),
        });
      },
    });
  }

  confirmTreasuryDeletion(event: Event, treasury: Treasury) {
    if (this.opTreasuryPanel?.overlayVisible) {
      this.opTreasuryPanel.hide();
    }
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_TREASURY_DELETE', {
        treasuryName: treasury.name,
      }),
      header: this.translate.instant('FINANCE.TREASURY_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteTreasury(treasury);
      },
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const data = this.treasuries.map((y) => {
        const row: Record<string, any> = {};
        this.columns.forEach((col) => {
          if (col.filterType === 'date' && y[col.field]) {
            row[col.header] = new Date(y[col.field]).toLocaleString(
              'ar-SA-u-ca-gregory',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
          } else {
            row[col.header] = y[col.field];
          }
        });
        return row;
      });
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      this.saveAsExcelFile(excelBuffer, 'Treasuries');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    FileSaver.saveAs(
      data,
      fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION
    );
  }

  exportBankExcel() {
    import('xlsx').then((xlsx) => {
      const data = this.generalBankAccounts.map((y) => {
        const row: Record<string, any> = {};
        this.bankColumns.forEach((col) => {
          if (col.filterType === 'date' && (y as any)[col.field]) {
            row[this.translate.instant(col.header)] = new Date((y as any)[col.field]).toLocaleString(
              'ar-SA-u-ca-gregory',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
          } else if (col.field === 'isActive') {
            row[this.translate.instant(col.header)] = (y as any)[col.field]
              ? (this.activeLanguage === 'ar' ? 'نشط' : 'Active')
              : (this.activeLanguage === 'ar' ? 'غير نشط' : 'Inactive');
          } else {
            row[this.translate.instant(col.header)] = (y as any)[col.field];
          }
        });
        return row;
      });
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      this.saveAsExcelFile(excelBuffer, 'BankAccounts');
    });
  }

  sendToFrontal(treasury: Treasury) {
    this.treasuryService.makeFrontal(treasury.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.TREASURY_SENT_TO_FRONTAL_SUCCESS'),
        });
        this.loadTreasury();
        if (this.opTreasuryPanel?.overlayVisible) {
          this.opTreasuryPanel.hide();
        }
      },
      error: (error) => {
        console.log('Error sending treasury to frontal', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.TREASURY_SENT_TO_FRONTAL_ERROR'),
        });
      },
    });
  }

  sendBankToFrontal(bankAccount: GeneralBankAccount) {
    this.treasuryService.makeGeneralBankAccountFrontal(bankAccount.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.BANK_ACCOUNT_SENT_TO_FRONTAL_SUCCESS'),
        });
        this.loadGeneralBankAccounts();
        if (this.opBankPanel?.overlayVisible) {
          this.opBankPanel.hide();
        }
      },
      error: (error) => {
        console.log('Error sending bank account to frontal', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.BANK_ACCOUNT_SENT_TO_FRONTAL_ERROR'),
        });
      },
    });
  }

  // ---------- Overlay Panel ----------
  @ViewChild('opTreasuryPanel') opTreasuryPanel!: OverlayPanel;
  @ViewChild('opBankPanel') opBankPanel!: OverlayPanel;
  selectedTreasuryForOverlay: Treasury | null = null;
  selectedBankForOverlay: GeneralBankAccount | null = null;
  showTreasuryOverlay(event: MouseEvent, treasury: Treasury) {
    event.preventDefault();
    event.stopPropagation();
    
    const isVisible = this.opTreasuryPanel.overlayVisible;
    const isDifferent = this.selectedTreasuryForOverlay?.id !== treasury.id;
    this.selectedTreasuryForOverlay = treasury;

    // Fix double-click issue
    if (isVisible && isDifferent) {
      this.opTreasuryPanel.show(event);
    } else {
      this.opTreasuryPanel.toggle(event);
    }

    // Position panel at mouse location
    setTimeout(() => {
      const panelEl = this.opTreasuryPanel.container as HTMLElement;
      if (!panelEl) return;

      panelEl.style.position = 'fixed';
      panelEl.style.left = `${event.clientX}px`;
      panelEl.style.top = `${event.clientY}px`;
      panelEl.style.zIndex = '9999';
    });
  }

  // --------------- General Bank Accounts (Tab 2) ---------------
  loadGeneralBankAccounts() {
    this.loadingBank = true;
  
    const request$ = this.isFrontal
      ? this.treasuryService.getAllFrontalGeneralBankAccounts() // ✅ لازم تعمل Service للـ frontal
      : this.treasuryService.getAllGeneralBankAccounts();
  
    request$.subscribe({
      next: (res: any[]) => {
        this.generalBankAccounts = (res ?? []).map((x: any) => ({
          id: x.id,
          accountName: x.accountName,
          bankName: x.bankName,
          iban: x.iban,
          isActive: !!x.isActive,
          isFrontal: !!x.isFrontal,
          createdAt: x.createdAt ? new Date(x.createdAt) : null,
          bankAccountNumber: x.bankAccountNumber ?? '',
          bankBranchName: x.bankBranchName ?? '',
          swiftCode: x.swiftCode ?? '',
          mainAccountId: x.mainAccountId ?? '',
        })) as GeneralBankAccount[];
        this.loadingBank = false;
      },
      error: (error) => {
        console.error('Error loading GeneralBankAccounts', error);
        this.loadingBank = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.BANK_ACCOUNTS_LOADING_ERROR'),
        });
      },
    });
  }
  
  closeBankDialog() {
    this.bankDialogVisibleSignal.set(false);
  }
  
  submitBankAccount() {
    if (this.bankAccountForm.invalid) {
      this.bankAccountForm.markAllAsTouched();
      return;
    }
  
    const v = this.bankAccountForm.value;
  
    if (this.selectedBankForOverlay?.id) {
      // 🟢 تعديل
      const payload = {
        id: this.selectedBankForOverlay.id,
        bankName: v.bankName,
        bankAccountNumber: v.bankAccountNumber,
        accountName: v.accountName,
        bankBranchName: v.bankBranchName,
        swiftCode: v.swiftCode,
        iban: v.iban,
        mainAccountId: v.mainAccountId,
        isActive: v.isActive,   // ✅ خده من الفورم
        isFrontal: v.isFrontal, // ✅ خده من الفورم
      };
      this.updateGeneralBankAccount(payload);
    } else {
      // 🟢 إضافة
      const payload = {
        bankName: v.bankName,
        bankAccountNumber: v.bankAccountNumber,
        accountName: v.accountName,
        bankBranchName: v.bankBranchName,
        swiftCode: v.swiftCode,
        iban: v.iban,
        mainAccountId: v.mainAccountId,
        isActive: v.isActive,   // ✅ جديد
        isFrontal: v.isFrontal,
      };
      this.createGeneralBankAccount(payload);
    }
  
    this.closeBankDialog();
  }
  
  
  /** POST: إنشاء حساب بنكي عام جديد (سيتم ربطه بالزر/الفورم في الـ HTML) */
  createGeneralBankAccount(payload: CreateGeneralBankAccountDto) {
    this.loadingBank = true;
    this.treasuryService.createGeneralBankAccount(payload).subscribe({
      next: (res: any) => {
        const mapped: GeneralBankAccount = {
          id: res.id,
          accountName: res.accountName,
          bankName: res.bankName,
          iban: res.iban,
          isActive: !!res.isActive,
          createdAt: res.createdAt ? new Date(res.createdAt) : null,
        
          // 🟢 ضيف باقي الحقول من الـ API أو قيم افتراضية
          bankAccountNumber: res.bankAccountNumber ?? '',
          bankBranchName: res.bankBranchName ?? '',
          swiftCode: res.swiftCode ?? '',
          createdBy: res.createdBy ?? '',
          mainAccountId: res.mainAccountId ?? '',
          isFrontal: res.isFrontal ?? false,
        };
        this.generalBankAccounts = [mapped, ...this.generalBankAccounts];
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.BANK_ACCOUNT_CREATED'),
        });
        this.loadingBank = false;
      },
      error: (error: any) => {
        console.error('Error creating GeneralBankAccount', error);
        this.loadingBank = false;
        const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('FINANCE.BANK_ACCOUNT_SAVING_ERROR');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: detailMsg,
        });
      },
    });
  }
/** PUT: تحديث حساب بنكي عام موجود */
updateGeneralBankAccount(payload: {
  id: string;
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  bankBranchName: string;
  swiftCode: string;
  iban: string;
  mainAccountId: string;
  isActive: boolean;
  isFrontal: boolean;
}) {
  this.loadingBank = true;
  this.treasuryService.updateGeneralBankAccount(payload).subscribe({
    next: (res: any) => {
      console.log("API Response:", res);
      const mapped: GeneralBankAccount = {
        id: res.id,
        accountName: res.accountName,
        bankName: res.bankName,
        iban: res.iban,
        isActive: !!res.isActive,
        createdAt: res.createdAt ? new Date(res.createdAt) : null,
  
        bankAccountNumber: res.bankAccountNumber ?? '',
        bankBranchName: res.bankBranchName ?? '',
        swiftCode: res.swiftCode ?? '',
        createdBy: res.createdBy ?? '',
        mainAccountId: res.mainAccountId ?? '',
        isFrontal: res.isFrontal ?? false,
      };

      // ✅ تحديث العنصر داخل الجدول بدون ما نعمل Reload كامل
      this.generalBankAccounts = this.generalBankAccounts.map(acc =>
        acc.id === res.id ? mapped : acc
      );

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: this.translate.instant('FINANCE.BANK_ACCOUNT_UPDATED'),
      });
      this.loadingBank = false;
    },
    error: (error) => {
      console.error('Error updating GeneralBankAccount', error);
      this.loadingBank = false;
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.BANK_ACCOUNT_SAVING_ERROR'),
      });
    },
  });
}

  clearBank(table: Table) {
    table.clear();
    this.searchBank = '';
  }

  filterBank(dt: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    this.searchBank = trimmedValue;
    dt.filterGlobal(trimmedValue, 'contains');
  }
}
