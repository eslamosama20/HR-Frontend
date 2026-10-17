import { Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { PaymentReceiptsService } from '../../../services/receipts/payment-receipts.service';
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
import { PaymentReceiptModel } from '../../../models/receipts/paymentReceipt.model';
import { MainAccountService } from '../../../services/accounting/main-account.service';
import { Router } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { PERMISSIONS } from '../../../config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-payment-receipt-list',
  templateUrl: './payment-receipt-list.component.html',
  styleUrl: './payment-receipt-list.component.scss',
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class PaymentReceiptListComponent implements OnInit {
  paymentReceiptsSignal = signal([]);
  paymentReceiptEntriesSignal = signal([]);

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
    private paymentReceiptService: PaymentReceiptsService,
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
  }

  ngOnInit(): void {
    this.loadPaymentReceipts();

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

  loadPaymentReceipts() {
    this.loading = true;
    if (this.isFrontal) {
      this.paymentReceiptService.getAllFrontal().subscribe({
        next: (paymentReceipts) => {
          this.paymentReceipts = paymentReceipts.map((x) => {
            x.createdAt = new Date(x.createdAt);
            x.receiptDate = new Date(x.receiptDate);
            return x;
          });
          this.loading = false;
        },
        error: (error) => {
          console.log('Error Loading PaymentReceipts', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RECEIPTS_LOADING_ERROR'),
          });
          this.loading = false;
        },
      });
    } else {
      this.paymentReceiptService.getAll().subscribe({
        next: (paymentReceipts) => {
          this.paymentReceipts = paymentReceipts.map((x) => {
            x.createdAt = new Date(x.createdAt);
            x.receiptDate = new Date(x.receiptDate);
            return x;
          });
          this.loading = false;
        },
        error: (error) => {
          console.log('Error Loading PaymentReceipts', error);
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

  get paymentReceipts() {
    return this.paymentReceiptsSignal();
  }
  set paymentReceipts(value) {
    this.paymentReceiptsSignal.set(value);
  }
  get paymentReceiptEntries() {
    return this.paymentReceiptEntriesSignal();
  }
  set paymentReceiptEntries(value) {
    this.paymentReceiptEntriesSignal.set(value);
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

  deletePaymentReceipt(paymentReceipt: PaymentReceiptModel) {
    this.loading = true;
    this.paymentReceiptService.delete(paymentReceipt.id).subscribe((res) => {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: this.translate.instant('FINANCE.RECEIPT_DELETED'),
      });
      this.loadPaymentReceipts();
    });
  }

  confirmPaymentReceiptDeletion(
    event: Event,
    paymentReceipt: PaymentReceiptModel
  ) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RECEIPT_DELETE', {
        referenceNumber: paymentReceipt.referenceNumber,
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
        this.deletePaymentReceipt(paymentReceipt);
      },
    });
  }

  navigateToAddPaymentReceipt() {
    if (this.isFrontal) {
      this.router.navigate(['/receipts/frontal-payment-receipts/new']);
    } else {
      this.router.navigate(['/receipts/payment-receipts/new']);
    }
  }

  navigateToPaymentReceipt(paymentReceipt: PaymentReceiptModel) {
    if (this.isFrontal) {
      this.router.navigate([
        '/receipts/frontal-payment-receipts/',
        paymentReceipt.id,
      ]);
    } else {
      this.router.navigate(['/receipts/payment-receipts/', paymentReceipt.id]);
    }
  }
  copyPaymentReceipt(paymentReceipt: PaymentReceiptModel) {
    this.opPaymentReceipt?.hide();

    const route = this.isFrontal
      ? '/receipts/frontal-payment-receipts/new'
      : '/receipts/payment-receipts/new';

    this.router.navigate([route], {
      queryParams: { copyId: paymentReceipt.id },
    });
  }

  sendToFrontal(paymentReceipt: PaymentReceiptModel) {
    this.loading = true;
    this.paymentReceiptService.makeFrontal(paymentReceipt.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: 'تم تحويل الإيصال إلى إيصال frontal بنجاح',
        });
        this.loadPaymentReceipts();
      },
      error: (error) => {
        console.error('Error making frontal', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: 'حدث خطأ أثناء تحويل الإيصال إلى إيصال frontal',
        });
      },
    });
  }
  @ViewChild('opPaymentReceipt') opPaymentReceipt!: OverlayPanel;
  selectedPaymentReceipt: any;

  openOverlayPaymentReceipt(event: MouseEvent, entry: any) {
    this.selectedPaymentReceipt = entry;
    this.opPaymentReceipt.toggle(event);

    setTimeout(() => {
      const panelEl = this.opPaymentReceipt.container as HTMLElement;
      if (panelEl) {
        panelEl.style.position = 'fixed';
        panelEl.style.left = `${event.clientX}px`;
        panelEl.style.top = `${event.clientY}px`;
      }
    });
  }
}
