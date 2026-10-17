import { Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { PaycheckReceiptsService } from '../../../services/receipts/paycheck-receipts.service';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../../modules/i18n';
import { AuthService } from '../../../modules/auth';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PermissionModel } from '../../../models/auth/permission.model';
import { UserAccountModel } from '../../../models/auth/userAccount.model';
import { PaycheckReceiptModel } from '../../../models/receipts/paycheckReceipt.model';
import { MainAccountService } from '../../../services/accounting/main-account.service';
import { Router } from '@angular/router';
import { PrintDocumentComponent } from '../../../shared-components/print-document/print-document.component';
import { CompanyDetailsModel } from '../../../models/inventory/companyDetails.model';
import { OverlayPanel } from 'primeng/overlaypanel';
import { PERMISSIONS } from '../../../config/permissions';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-paycheck-receipt-list',
  templateUrl: './paycheck-receipt-list.component.html',
  styleUrl: './paycheck-receipt-list.component.scss',
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class PaycheckReceiptListComponent implements OnInit {
  paycheckReceiptsSignal = signal([]);
  paycheckReceiptEntriesSignal = signal([]);
  cancellationDialogVisible: boolean = false;
  cancellationReason: string = '';
  targetReceiptToDelete: PaycheckReceiptModel | null = null;

  loading: boolean = true;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);

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
  constructor(
    private paycheckReceiptService: PaycheckReceiptsService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    private mainAccountService: MainAccountService,
    private router: Router
  ) {
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
  }

  ngOnInit(): void {
    this.loadPaycheckReceipts();

    this.columns = [
      {
        field: 'referenceNumber',
        header: this.translate.instant('FINANCE.REFERENCE_NUMBER'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'description',
        header: this.translate.instant('FINANCE.DESCRIPTION'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'treasury.name',
        header: this.translate.instant('FINANCE.TREASURY_NAME'),
        filter: false,
      },
      {
        field: 'receiptDate',
        header: this.translate.instant('FINANCE.RECEIPT_DATE'),
        filter: true,
        filterType: 'date',
      },
      {
        field: 'createdAt',
        header: this.translate.instant('FINANCE.CREATED_AT'),
        filter: true,
        filterType: 'date',
      },
    ];
  }

  loadPaycheckReceipts() {
    this.loading = true;
    if (this.isFrontal) {
      this.paycheckReceiptService.getAllFrontal().subscribe({
        next: (paycheckReceipts) => {
          this.paycheckReceipts = paycheckReceipts.map((x) => {
            x.createdAt = new Date(x.createdAt);
            x.receiptDate = new Date(x.receiptDate);
            return x;
          });
          this.loading = false;
        },
        error: (error) => {
          console.log('Error Loading PaycheckReceipts', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPTS_LOADING_ERROR'),
          });
          this.loading = false;
        },
      });
    } else {
      this.paycheckReceiptService.getAll().subscribe({
        next: (paycheckReceipts) => {
          this.paycheckReceipts = paycheckReceipts.map((x) => {
            x.createdAt = new Date(x.createdAt);
            x.receiptDate = new Date(x.receiptDate);
            return x;
          });
          this.loading = false;
        },
        error: (error) => {
          console.log('Error Loading PaycheckReceipts', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPTS_LOADING_ERROR'),
          });
          this.loading = false;
        },
      });
    }
  }

  get paycheckReceipts() {
    return this.paycheckReceiptsSignal();
  }
  set paycheckReceipts(value) {
    this.paycheckReceiptsSignal.set(value);
  }
  get paycheckReceiptEntries() {
    return this.paycheckReceiptEntriesSignal();
  }
  set paycheckReceiptEntries(value) {
    this.paycheckReceiptEntriesSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal();
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  readonly PERMISSIONS = PERMISSIONS;

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;

    dt1.filterGlobal(target.value, 'contains');
  }

  deletePaycheckReceipt(paycheckReceipt: PaycheckReceiptModel, reason: string) {
    this.loading = true;
    this.paycheckReceiptService.delete(paycheckReceipt.id, reason).subscribe((res) => {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: this.translate.instant('FINANCE.RECEIPT_DELETED'),
      });
      this.loadPaycheckReceipts();
    });
  }

  confirmPaycheckReceiptDeletion(
    event: Event,
    paycheckReceipt: PaycheckReceiptModel
  ) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RECEIPT_DELETE', {
        referenceNumber: paycheckReceipt.referenceNumber,
      }),
      header: this.translate.instant('FINANCE.RECEIPT_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.targetReceiptToDelete = paycheckReceipt;
        this.cancellationReason = '';
        this.cancellationDialogVisible = true;
      },
    });
  }

  confirmListReceiptCancellation(): void {
    if (this.targetReceiptToDelete) {
      this.deletePaycheckReceipt(this.targetReceiptToDelete, this.cancellationReason.trim() || 'إلغاء السند');
      this.targetReceiptToDelete = null;
    }
    this.cancellationDialogVisible = false;
  }

  navigateToAddPaycheckReceipt() {
    if (this.isFrontal) {
      this.router.navigate(['/receipts/frontal-paycheck-receipts/new']);
    } else {
      this.router.navigate(['/receipts/paycheck-receipts/new']);
    }
  }

  navigateToPaycheckReceipt(paycheckReceipt: PaycheckReceiptModel) {
    if (this.isFrontal) {
      this.router.navigate([
        '/receipts/frontal-paycheck-receipts/',
        paycheckReceipt.id,
      ]);
    } else {
      this.router.navigate([
        '/receipts/paycheck-receipts/',
        paycheckReceipt.id,
      ]);
    }
  }
  copyPaycheckReceipt(paycheckReceipt: PaycheckReceiptModel) {
    this.opPaycheckReceipt?.hide();

    const route = this.isFrontal
      ? '/receipts/frontal-paycheck-receipts/new'
      : '/receipts/paycheck-receipts/new';

    this.router.navigate([route], {
      queryParams: { copyId: paycheckReceipt.id },
    });
  }

  sendToFrontal(paycheckReceipt: PaycheckReceiptModel) {
    this.loading = true;
    this.paycheckReceiptService.makeFrontal(paycheckReceipt.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.RECEIPT_SENT_TO_FRONTAL'),
        });
        this.loadPaycheckReceipts();
      },
      error: (error) => {
        console.error('Error sending paycheck receipt to frontal:', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RECEIPT_SENDING_ERROR'),
        });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
  @ViewChild('opPaycheckReceipt') opPaycheckReceipt!: OverlayPanel;
  selectedPaycheckReceipt: any;

  openOverlayPaycheckReceipt(event: MouseEvent, entry: any) {
    this.selectedPaycheckReceipt = entry;
    this.opPaycheckReceipt.toggle(event);

    setTimeout(() => {
      const panelEl = this.opPaycheckReceipt.container as HTMLElement;
      if (panelEl) {
        panelEl.style.position = 'fixed';
        panelEl.style.left = `${event.clientX}px`;
        panelEl.style.top = `${event.clientY}px`;
      }
    });
  }
}
