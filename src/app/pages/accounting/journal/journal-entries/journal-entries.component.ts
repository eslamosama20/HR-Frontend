import {Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {Table} from "primeng/table";
import {TransactionService} from "../../../../services/accounting/transaction.service";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../../modules/i18n";
import {AuthService} from "../../../../modules/auth";
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {PermissionModel} from "../../../../models/auth/permission.model";
import {UserAccountModel} from "../../../../models/auth/userAccount.model";
import {TransactionModel} from "../../../../models/accounting/transaction.model";
import primengArTranslations from "../../../../utils/primengArTranslations";
import {Option} from "@angular/cli/src/command-builder/utilities/json-schema";
import {MainAccountService} from "../../../../services/accounting/main-account.service";
import {TransactionEntryModel} from "../../../../models/accounting/transactionEntry.model";
import {TransactionEntryService} from "../../../../services/accounting/transaction-entries.service";
import {MainAccountModel} from "../../../../models/accounting/mainAccount.model";

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-journal-entries',
  templateUrl: './journal-entries.component.html',
  styleUrl: './journal-entries.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class JournalEntriesComponent implements OnInit {
  transactionEntriesSignal = signal([]);
  loading: boolean = true;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  constructor(
    private transactionService: TransactionService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private transactionEntryService: TransactionEntryService,
    private primengConfig: PrimeNGConfig
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  ngOnInit(): void {
    this.loadTransactionEntries();

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {
        field: 'transaction.referenceNumber',
        header: this.translate.instant('FINANCE.REFERENCE_NUMBER'),
        filter: true,
        filterType: 'text'
      },
      {
        field: 'mainAccount.referenceCode',
        header: this.translate.instant('FINANCE.MAIN_ACCOUNT_REFERENCE_CODE'),
        filter: true,
        filterType: 'text'
      },
      {
        field: this.activeLanguage === 'en' ? 'mainAccount.englishName' : 'mainAccount.arabicName',
        header: this.translate.instant('FINANCE.MAIN_ACCOUNT'),
        filter: true,
        filterType: 'text'
      },
      {
        field: this.activeLanguage === 'en' ? 'transaction.transactionType.englishName' : 'transaction.transactionType.arabicName',
        header: this.translate.instant('FINANCE.TRANSACTION_TYPE'),
        filter: true,
        filterType: 'text'
      },
      {
        field: 'creditAmount',
        header: this.translate.instant('FINANCE.CREDIT'),
        filter: true,
        filterType: 'numeric'
      },
      {
        field: 'debitAmount',
        header: this.translate.instant('FINANCE.DEBIT'),
        filter: true,
        filterType: 'numeric'
      },
      {
        field: 'transaction.transactionDate',
        header: this.translate.instant('FINANCE.TRANSACTION_DATE'),
        filter: true,
        filterType: 'date'
      },
      {
        field: 'createdAt',
        header: this.translate.instant('FINANCE.CREATED_AT'),
        filter: true,
        filterType: 'date'
      },
    ]
  }
  loadTransactionEntries() {
    this.loading = true;
    this.transactionEntryService.getAll().subscribe({
      next: transactionEntries => {
        this.transactionEntries = transactionEntries.map(x => {
          x.createdAt = new Date(x.createdAt);
          x.transaction.transactionDate = new Date(x.transaction.transactionDate);
          return x;
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Transaction Entries', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.TRANSACTION_ENTRIES_LOADING_ERROR') });
        this.loading = false;
      }
    });
  }

  get transactionEntries() {
    return this.transactionEntriesSignal();
  }
  set transactionEntries(value) {
    this.transactionEntriesSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }
  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains')
  }

}
