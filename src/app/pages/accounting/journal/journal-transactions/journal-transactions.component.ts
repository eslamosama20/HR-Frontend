import primengArTranslations from '../../../../utils/primengArTranslations';
import { Component, ElementRef, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { Table } from "primeng/table";
import { TransactionService, TransactionFilterParams } from "../../../../services/accounting/transaction.service";
import { ConfirmationService, MessageService, PrimeNGConfig } from "primeng/api";
import { TranslateService } from "@ngx-translate/core";
import { TranslationService } from "../../../../modules/i18n";
import { AuthService } from "../../../../modules/auth";
import { FormBuilder, FormGroup } from "@angular/forms";
import { PermissionModel } from "../../../../models/auth/permission.model";
import { UserAccountModel } from "../../../../models/auth/userAccount.model";
import { TransactionModel } from "../../../../models/accounting/transaction.model";
import { MainAccountService } from "../../../../services/accounting/main-account.service";
import { TransactionTypeService } from "../../../../services/accounting/transaction-type.service";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { MainAccountModel } from "../../../../models/accounting/mainAccount.model";
import { OverlayPanel } from "primeng/overlaypanel";
import { formatImportErrorMessage } from "../../../../shared/utils/import-error-message";
import * as XLSX from 'xlsx';
import {
  TransactionImportFailure,
  TransactionImportResult,
  TransactionBulkDeleteFailure,
  TransactionBulkDeleteResult
} from "../../../../services/accounting/transaction.service";
import { PERMISSIONS } from '../../../../config/permissions';
import { formatDateOnlyToString, formatStartOfDayToUTCString, formatEndOfDayToUTCString } from '../../../../utils/dateUtils';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-journal-transactions',
  templateUrl: './journal-transactions.component.html',
  styleUrl: './journal-transactions.component.scss',
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }]
})
export class JournalTransactionsComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  transactionsSignal = signal([]);
  transactionEntriesSignal = signal([]);

  @ViewChild('fileUpload') fileUpload!: ElementRef<HTMLInputElement>;

  showImportInstructionsSignal = signal(false);
  get showImportInstructions() {
    return this.showImportInstructionsSignal();
  }
  set showImportInstructions(value) {
    this.showImportInstructionsSignal.set(value);
  }

  importInstructions = {
    title: '',
    description: '',
    headers: [] as string[],
    notes: [] as string[]
  };

  importProgressSignal = signal({ current: 0, total: 0, isImporting: false });
  get importProgress() {
    return this.importProgressSignal();
  }

  importFailures: TransactionImportFailure[] = [];
  importHeaders: string[] = [];
  showImportFailuresDialog = false;

  selectedTransactions: TransactionModel[] = [];
  showBulkDeleteFailuresDialog = false;
  bulkDeleteFailures: TransactionBulkDeleteFailure[] = [];
  isBulkDeleting = false;
  showDeleted = false;

  loading: boolean = true;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);
  transactionEntryFormGroup: FormGroup;

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
  copyTransaction(transaction: any) {
    if (!transaction?.id) return;

    if (this.isFrontal) {
      this.router.navigate(
        ['/accounting/frontal-journal-transactions/transaction'],
        {
          queryParams: { copyId: transaction.id },
        }
      );
    } else {
      this.router.navigate(['/accounting/journal-transactions/transaction'], {
        queryParams: { copyId: transaction.id },
      });
    }
  }

  constructor(
    private transactionService: TransactionService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    private mainAccountService: MainAccountService,
    private transactionTypeService: TransactionTypeService,
    private router: Router
  ) {
    this.router = router;
    this.isFrontal = this.router.url.includes('frontal');

    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation({
        ...primengArTranslations,
        dateFormat: 'dd/mm/yy'
      });
    } else {
      this.primengConfig.setTranslation({
        dateFormat: 'dd/mm/yy'
      });
    }
    this.initializeImportInstructions();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (!!this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }

  ngOnInit(): void {
    this.loadTransactions();
    this.loadData();

    this.columns = [
      { field: 'referenceNumber', header: this.translate.instant('FINANCE.REFERENCE_NUMBER'), filter: true, filterType: 'text' },
      { field: this.activeLanguage === 'en' ? 'transactionType.englishName' : 'transactionType.arabicName', header: this.translate.instant('FINANCE.TRANSACTION_TYPE'), filter: true, filterType: 'text' },
      { field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION'), filter: true, filterType: 'text' },
      { field: 'transactionDate', header: this.translate.instant('FINANCE.TRANSACTION_DATE'), filter: true, filterType: 'date' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' },
    ];
  }


  totalRecords: number = 0;
  pageSize: number = 10;
  lastLazyEvent: any = null;
  transactionTypesList: any[] = [];

  private extractFilterValue(filterMeta: any): any {
    if (!filterMeta) return null;
    if (Array.isArray(filterMeta)) {
      const active = filterMeta.find(m => m && m.value !== null && m.value !== undefined && m.value !== '');
      return active ? { value: active.value, matchMode: active.matchMode } : null;
    }
    if (typeof filterMeta === 'object' && 'value' in filterMeta) {
      if (filterMeta.value !== null && filterMeta.value !== undefined && filterMeta.value !== '') {
        return { value: filterMeta.value, matchMode: filterMeta.matchMode };
      }
      return null;
    }
    return (filterMeta !== null && filterMeta !== undefined && filterMeta !== '') ? { value: filterMeta, matchMode: 'contains' } : null;
  }

  private formatDateForApi(dateVal: any): string | null {
    if (!dateVal) return null;
    return formatDateOnlyToString(dateVal) || null;
  }

  loadTransactionsLazy(event: any) {
    this.loading = true;
    this.lastLazyEvent = event;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    this.pageSize = size;

    const filterParams: TransactionFilterParams = {};
    if (this.showDeleted) {
      filterParams.isActive = false;
    }

    // 1. Global Search
    const globalVal = event.filters?.['global']?.value || this.searchValue || '';
    if (globalVal?.trim()) {
      filterParams.searchKeyword = globalVal.trim();
    }

    // 2. Reference Number
    const refMeta = this.extractFilterValue(event.filters?.['referenceNumber']);
    if (refMeta?.value) {
      filterParams.referenceNumber = String(refMeta.value).trim();
    }

    // 3. Description
    const descMeta = this.extractFilterValue(event.filters?.['description']);
    if (descMeta?.value) {
      filterParams.description = String(descMeta.value).trim();
    }

    // 4. Transaction Type
    const typeField = this.activeLanguage === 'en' ? 'transactionType.englishName' : 'transactionType.arabicName';
    const typeMeta = this.extractFilterValue(event.filters?.[typeField]) || this.extractFilterValue(event.filters?.['transactionTypeId']);
    if (typeMeta?.value) {
      const valStr = String(typeMeta.value).trim().toLowerCase();
      const matched = this.transactionTypesList?.find(t =>
        t.id?.toLowerCase() === valStr ||
        t.arabicName?.toLowerCase().includes(valStr) ||
        t.englishName?.toLowerCase().includes(valStr)
      );
      if (matched?.id) {
        filterParams.transactionTypeId = matched.id;
      }
    }

    // 5. Transaction Date
    if (event.filters?.['transactionDate']) {
      const meta = event.filters['transactionDate'];
      const list = Array.isArray(meta) ? meta : [meta];
      for (const item of list) {
        if (!item || item.value === null || item.value === undefined || item.value === '') continue;
        const formatted = this.formatDateForApi(item.value);
        if (!formatted) continue;
        const mode = (item.matchMode || 'dateIs').toLowerCase();
        if (mode.includes('after') || mode.includes('greater')) {
          filterParams.fromTransactionDate = formatted;
        } else if (mode.includes('before') || mode.includes('less')) {
          filterParams.toTransactionDate = formatted;
        } else {
          filterParams.transactionDate = formatted;
        }
      }
    }

    // 6. Created At
    if (event.filters?.['createdAt']) {
      const meta = event.filters['createdAt'];
      const list = Array.isArray(meta) ? meta : [meta];
      for (const item of list) {
        if (!item || item.value === null || item.value === undefined || item.value === '') continue;
        const mode = (item.matchMode || 'dateIs').toLowerCase();
        const startUtc = formatStartOfDayToUTCString(item.value);
        const endUtc = formatEndOfDayToUTCString(item.value);
        if (mode.includes('after') || mode.includes('greater')) {
          filterParams.fromCreatedAt = startUtc;
        } else if (mode.includes('before') || mode.includes('less')) {
          filterParams.toCreatedAt = endUtc;
        } else {
          filterParams.fromCreatedAt = startUtc;
          filterParams.toCreatedAt = endUtc;
        }
      }
    }

    // 7. Sort
    let sortField = event.sortField;
    const sortOrder = event.sortOrder;
    if (sortField && sortField.includes('.')) {
      sortField = null; // Avoid nested navigation property sorting on server
    }

    if (this.isFrontal) {
      this.transactionService.getAllFrontalPaged(page, size, this.showDeleted, filterParams, sortField, sortOrder).subscribe({
        next: res => {
          this.transactions = (res.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            x.transactionDate = new Date(x.transactionDate);
            return x;
          });
          this.totalRecords = res.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Transactions', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.TRANSACTIONS_LOADING_ERROR') });
          this.loading = false;
        }
      });
    } else {
      this.transactionService.getTransactionsPaged(page, size, filterParams, this.showDeleted, sortField, sortOrder).subscribe({
        next: res => {
          this.transactions = (res.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            x.transactionDate = new Date(x.transactionDate);
            return x;
          });
          this.totalRecords = res.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Transactions', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.TRANSACTIONS_LOADING_ERROR') });
          this.loading = false;
        }
      });
    }
  }

  loadTransactions() {
    this.loadTransactionsLazy(this.lastLazyEvent || { first: 0, rows: this.pageSize });
  }


  get transactions() {
    return this.transactionsSignal();
  }
  set transactions(value) {
    this.transactionsSignal.set(value);
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


  toggleShowDeleted(table?: Table) {
    this.showDeleted = !this.showDeleted;
    this.selectedTransactions = [];
    if (table) {
      table.reset();
    } else {
      this.loadTransactions();
    }
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    dt1.filterGlobal(trimmedValue, 'contains')
  }


  deleteTransaction(transaction: TransactionModel) {
    this.loading = true;
    this.transactionService.delete(transaction.id).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.TRANSACTION_MARKED_DELETED') });
      this.loadTransactions();
    });
  }

  canDeleteTransaction(transaction: TransactionModel): boolean {
    if (!transaction.isActive) return false;
    return !(
      transaction.saleInvoiceId ||
      transaction.purchaseInvoiceId ||
      transaction.salesReturnId ||
      transaction.purchaseReturnId ||
      transaction.paymentReceiptId ||
      transaction.paycheckReceiptId ||
      transaction.inventoryPermitId ||
      transaction.inventoryStocktakingId ||
      transaction.reservationId ||
      transaction.debitNoteId ||
      transaction.creditNoteId
    );
  }

  getDeleteDisableTooltip(transaction: TransactionModel): string {
    if (transaction.isActive === false) {
      return this.activeLanguage === 'ar' ? 'القيد محذوف' : 'Transaction is deleted';
    }
    return this.activeLanguage === 'ar' ? 'القيد مرتبط بمستند آخر' : 'Transaction is linked to another document';
  }

  restoreTransaction(transaction: TransactionModel) {
    this.loading = true;
    this.transactionService.restore(transaction.id).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.TRANSACTION_RESTORED') });
        this.loadTransactions();
        if (this.selectedTransaction?.id === transaction.id) {
          this.opTransactionPanel.hide();
          this.selectedTransaction = null;
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Restore error', err);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.TRANSACTION_RESTORE_ERROR') });
      }
    });
  }

  confirmTransactionRestore(event: Event, transaction: TransactionModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_TRANSACTION_RESTORE', { referenceNumber: transaction.referenceNumber }),
      header: this.translate.instant('FINANCE.TRANSACTION_RESTORE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-success p-button-text rounded-md',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.restoreTransaction(transaction);
      },
    });
  }

  getClientBlockedCount(): number {
    return this.selectedTransactions.filter(t => !this.canDeleteTransaction(t)).length;
  }

  getClientDeletableCount(): number {
    return this.selectedTransactions.filter(t => this.canDeleteTransaction(t)).length;
  }

  isAllEligibleSelected(): boolean {
    const currentPageTransactions = this.getCurrentPageTransactions();
    const deletableTransactions = currentPageTransactions.filter(t => this.canDeleteTransaction(t));
    if (deletableTransactions.length === 0) return false;
    return deletableTransactions.every(t => this.selectedTransactions.some(st => st.id === t.id));
  }

  hasEligibleTransactions(): boolean {
    const currentPageTransactions = this.getCurrentPageTransactions();
    return currentPageTransactions.some(t => this.canDeleteTransaction(t));
  }

  onPageChange(event: any) {
    this.currentPageFirstIndex = event.first;
    this.currentPageSize = event.rows;
  }

  currentPageFirstIndex: number = 0;
  currentPageSize: number = 10;

  getCurrentPageTransactions(): TransactionModel[] {
    return this.transactions || [];
  }

  toggleSelectAllEligible(event: any) {
    const isChecked = event?.checked !== undefined ? !!event.checked : !!(event?.target as HTMLInputElement)?.checked;
    const currentPageTransactions = this.getCurrentPageTransactions();

    if (isChecked) {
      const deletableTransactions = currentPageTransactions.filter(t => this.canDeleteTransaction(t));
      const newSelected = [...this.selectedTransactions];
      for (const t of deletableTransactions) {
        if (!newSelected.some(st => st.id === t.id)) {
          newSelected.push(t);
        }
      }
      this.selectedTransactions = newSelected;
    } else {
      const deletableIds = currentPageTransactions.filter(t => this.canDeleteTransaction(t)).map(t => t.id);
      this.selectedTransactions = this.selectedTransactions.filter(t => !deletableIds.includes(t.id));
    }
  }

  bulkDelete() {
    if (this.selectedTransactions.length === 0) return;

    const blockedCount = this.getClientBlockedCount();
    const deletableCount = this.getClientDeletableCount();

    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_BULK_DELETE', {
        total: this.selectedTransactions.length,
        blocked: blockedCount,
        deletable: deletableCount
      }),
      header: this.translate.instant('FINANCE.BULK_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.executeBulkDelete();
      },
    });
  }

  executeBulkDelete() {
    this.isBulkDeleting = true;
    const uniqueIds = [...new Set(this.selectedTransactions.map(t => t.id))];

    this.transactionService.bulkDelete(uniqueIds).subscribe({
      next: (result: TransactionBulkDeleteResult) => {
        this.isBulkDeleting = false;

        const failedCount = result.failed?.length ?? 0;
        const deletedCount = result.deleted ?? 0;

        if (failedCount === 0 && deletedCount > 0) {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.BULK_DELETE_SUCCESS', { count: deletedCount })
          });
        } else if (deletedCount > 0 && failedCount > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('FINANCE.WARNING'),
            detail: this.translate.instant('FINANCE.BULK_DELETE_PARTIAL', { deleted: deletedCount, failed: failedCount })
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.BULK_DELETE_FAILED', { count: failedCount })
          });
        }

        if (failedCount > 0) {
          this.bulkDeleteFailures = result.failed;
          this.showBulkDeleteFailuresDialog = true;
        }

        this.selectedTransactions = [];
        this.loadTransactions();
      },
      error: (err) => {
        this.isBulkDeleting = false;
        console.error('Bulk delete error', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.BULK_DELETE_ERROR')
        });
      }
    });
  }

  confirmBulkDelete(event: Event) {
    this.bulkDelete();
  }

  getBulkDeleteFailureReason(failure: TransactionBulkDeleteFailure): string {
    return this.activeLanguage === 'ar' ? failure.reasonAr : failure.reason;
  }

  confirmTransactionDeletion(event: Event, transaction: TransactionModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_TRANSACTION_DELETE', { referenceNumber: transaction.referenceNumber }),
      header: this.translate.instant('FINANCE.TRANSACTION_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteTransaction(transaction);
      },
    });
  }

  navigateToAddTransaction() {
    if (this.isFrontal) {
      this.router.navigate(['/accounting/frontal-journal-transactions/transaction']);
    } else {
      this.router.navigate(['/accounting/journal-transactions/transaction']);
    }
  }

  navigateToTransaction(transaction: TransactionModel) {
    if (!transaction.isActive) return;
    if (this.isFrontal) {
      this.router.navigate(['/accounting/frontal-journal-transactions/transaction', transaction.id]);
    } else {
      this.router.navigate(['/accounting/journal-transactions/transaction', transaction.id]);
    }
  }

  onFileSelect(event: any): void {
    const file: File = event?.files?.[0] || event?.target?.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.INVALID_HEADER'),
      });
      this.clearFileInput();
      return;
    }

    this.importProgressSignal.set({ current: 0, total: 1, isImporting: true });

    this.transactionService.importFromExcel(file).subscribe({
      next: (result: TransactionImportResult) => {
        this.importProgressSignal.set({ current: 0, total: 0, isImporting: false });
        this.clearFileInput();

        const failCount = result.failed?.length ?? 0;
        const severity = failCount > 0 && result.imported === 0 && result.updated === 0
          ? 'error'
          : failCount > 0
            ? 'warn'
            : 'success';

        const summary = this.activeLanguage === 'ar'
          ? `مستورد: ${result.imported} — محدّث: ${result.updated} — فشل: ${failCount}`
          : `Imported: ${result.imported} — Updated: ${result.updated} — Failed: ${failCount}`;

        this.messageService.add({
          severity,
          summary: this.translate.instant(severity === 'success' ? 'FINANCE.SUCCESS' : 'FINANCE.WARNING'),
          detail: summary,
          life: 8000,
          styleClass: `import-toast import-toast--${severity}`,
        });

        if (failCount > 0) {
          this.importFailures = result.failed;
          this.importHeaders = result.headers ?? [];
          this.showImportFailuresDialog = true;
        }

        this.loadTransactions();
      },
      error: (err) => {
        this.importProgressSignal.set({ current: 0, total: 0, isImporting: false });
        this.clearFileInput();
        console.error('Import error', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
          styleClass: 'import-toast import-toast--error',
        });
      }
    });
  }

  private clearFileInput(): void {
    if (this.fileUpload?.nativeElement) {
      this.fileUpload.nativeElement.value = '';
    }
  }

  getImportFailureReason(failure: TransactionImportFailure): string {
    if (failure?.reason?.trim()) {
      return failure.reason;
    }
    return formatImportErrorMessage(this.translate, failure);
  }

  getImportFailureReasonPreview(failure: TransactionImportFailure, maxLength = 120): string {
    const reason = this.getImportFailureReason(failure);
    if (reason.length <= maxLength) {
      return reason;
    }
    return `${reason.substring(0, maxLength - 3)}...`;
  }

  isImportFailureReasonTruncated(failure: TransactionImportFailure, maxLength = 120): boolean {
    return this.getImportFailureReason(failure).length > maxLength;
  }

  getImportFailureVisualState(failure: TransactionImportFailure): { icon: string; chipClass: string } {
    const normalizedCode = (failure.errorCode ?? '')
      .replace(/^IMPORT_ERROR_/i, '')
      .toUpperCase();

    switch (normalizedCode) {
      case 'DUPLICATE_NAME':
        return { icon: 'pi pi-copy', chipClass: 'failure-chip failure-chip--warning' };
      case 'MISSING_REQUIRED_FIELD':
        return { icon: 'pi pi-exclamation-circle', chipClass: 'failure-chip failure-chip--warning' };
      case 'INVALID_FORMAT':
        return { icon: 'pi pi-ban', chipClass: 'failure-chip failure-chip--danger' };
      case 'DATABASE_CONSTRAINT':
        return { icon: 'pi pi-database', chipClass: 'failure-chip failure-chip--danger' };
      case 'TRANSACTION_FAILED':
        return { icon: 'pi pi-times-circle', chipClass: 'failure-chip failure-chip--danger' };
      default:
        return { icon: 'pi pi-info-circle', chipClass: 'failure-chip failure-chip--neutral' };
    }
  }

  downloadFailedImportRows(): void {
    if (!this.importHeaders.length || !this.canDownloadFailedRows) {
      return;
    }

    const failureReasonHeader = this.activeLanguage === 'ar' ? 'سبب الفشل' : 'Failure Reason';
    const worksheetData: (string | number)[][] = [];

    const headerRow = [...this.importHeaders, failureReasonHeader];
    worksheetData.push(headerRow as (string | number)[]);

    for (const failure of this.importFailures) {
      const values = failure.values ?? [];
      if (values.length === 0) {
        continue;
      }
      const paddedValues = [...values];
      while (paddedValues.length < this.importHeaders.length) {
        paddedValues.push('');
      }
      const reason = this.getImportFailureReason(failure);
      const rowWithReason = [...paddedValues, reason];
      worksheetData.push(rowWithReason as (string | number)[]);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');

    const date = new Date().toISOString().split('T')[0];
    const fileName = `journal-transaction-import-failed-rows-${date}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  }

  get canDownloadFailedRows(): boolean {
    const hasExportableRows = this.importFailures.some(f => (f.values?.length ?? 0) > 0);
    return hasExportableRows && this.importHeaders.length > 0;
  }

  transactionTypeId: string = null;
  mainAccountsSignal = signal<MainAccountModel[]>([]);
  get mainAccounts() {
    return this.mainAccountsSignal();
  }
  set mainAccounts(value) {
    this.mainAccountsSignal.set(value);
  }
  loadData(): void {
    this.transactionTypeService.getAll().subscribe({
      next: (transactionTypes) => {
        this.transactionTypesList = transactionTypes || [];
        this.transactionTypeId = transactionTypes.find(transactionType => transactionType.arabicName === 'قيد يوميه' || transactionType.englishName === 'Transaction')?.id;
      },
      error: (err) => {
        console.error('Error loading data', err);
      }
    });
  }

  showImportInstructionsDialog() {
    this.showImportInstructions = true;
  }

  confirmImportInstructions() {
    this.showImportInstructions = false;
    if (this.fileUpload?.nativeElement) {
      this.fileUpload.nativeElement.click();
    }
  }

  downloadTemplate() {
    this.transactionService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'transaction-import-template.xlsx';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
        });
      },
    });
  }

  cancelImportInstructions() {
    this.showImportInstructions = false;
  }

  private initializeImportInstructions(): void {
    this.importInstructions = {
      title: this.activeLanguage === 'ar' ? 'تعليمات استيراد قيود اليومية' : 'Journal Transactions Import Instructions',
      description: this.activeLanguage === 'ar'
        ? 'يرجى الالتزام بترتيب وصيغة الأعمدة التالية قبل رفع ملف Excel.'
        : 'Please keep the following columns and order before uploading the Excel file.',
      headers: [
        this.activeLanguage === 'ar' ? '* serial (الرقم التسلسلي)' : '* serial',
        this.activeLanguage === 'ar' ? '* transaction date (تاريخ الحركة)' : '* transaction date',
        this.activeLanguage === 'ar' ? '* description (وصف القيد)' : '* description',
        this.activeLanguage === 'ar' ? '* main account (الحساب الرئيسي)' : '* main account',
        this.activeLanguage === 'ar' ? '* debit (مدين)' : '* debit',
        this.activeLanguage === 'ar' ? '* credit (دائن)' : '* credit',
        this.activeLanguage === 'ar' ? 'description (وصف السطر)' : 'description (entry description)',
      ],
      notes: [
        this.activeLanguage === 'ar'
          ? 'تأكد من أن الصف الأول يحتوي على أسماء الأعمدة بنفس الشكل.'
          : 'Ensure the first row contains the exact expected headers.',
        this.activeLanguage === 'ar'
          ? 'التنسيق المدعوم للملف: .xlsx أو .xls'
          : 'Supported file formats: .xlsx or .xls',
        this.activeLanguage === 'ar'
          ? 'يمكن تحميل نموذج جاهز من زر "تحميل النموذج".'
          : 'You can download a ready template using "Download Template".',
      ]
    };
  }

  sendToFrontal(transaction) {
    this.transactionService.makeFrontal(transaction.id).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم إرسال قيد اليوميه إلى الجهة الأمامية بنجاح" });
        this.loadTransactions();
      },
      error: (error) => {
        console.error('Error making Transaction frontal:', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء إرسال قيد اليوميه إلى الجهة الأمامية" });
      }
    });
  }
  @ViewChild('opTransactionPanel') opTransactionPanel!: OverlayPanel;
  selectedTransaction: any | null = null;

  showTransactionOverlay(event: MouseEvent, entry: any) {
    event.preventDefault(); // منع القائمة السياقية الافتراضية
    event.stopPropagation();

    const isVisible = this.opTransactionPanel?.overlayVisible;
    const isDifferent = this.selectedTransaction?.id !== entry?.id;
    this.selectedTransaction = entry;

    if (isVisible && isDifferent) {
      this.opTransactionPanel.show(event);
    } else {
      this.opTransactionPanel.toggle(event);
    }

    setTimeout(() => {
      const panelEl = this.opTransactionPanel?.container as HTMLElement;
      if (!panelEl) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelRect = panelEl.getBoundingClientRect();

      let left = event.clientX + 5;
      let top = event.clientY + 5;

      if (left + panelRect.width > viewportWidth) left = viewportWidth - panelRect.width - 10;
      if (left < 10) left = 10;

      if (top + panelRect.height > viewportHeight) top = viewportHeight - panelRect.height - 10;
      if (top < 10) top = 10;

      panelEl.style.position = 'fixed';
      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
      panelEl.style.zIndex = '9999';
    });
  }
}
