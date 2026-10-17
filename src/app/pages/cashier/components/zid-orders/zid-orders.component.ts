import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SidebarModule } from 'primeng/sidebar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ZidOrdersService } from 'src/app/services/cashier/zid-orders.service';
import {
  ZidOrder,
  ZidPaymentStatus,
  ZidOrderStatus,
  ZidSyncStatus
} from 'src/app/models/cashier/zid-integration.model';
import {
  getZidOrderStatusSeverity,
  getZidPaymentStatusSeverity,
  getZidSyncStatusSeverity
} from 'src/app/adapters/cashier/zid-order.adapter';
import { mapError } from 'src/app/shared/utils/runtime-error.util';
import { ZidShellComponent } from '../zid-shared/zid-shell.component';
import { ZidEmptyStateComponent } from '../zid-shared/zid-empty-state.component';
import { ZidSkeletonComponent } from '../zid-shared/zid-skeleton.component';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-zid-orders',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    TagModule,
    SidebarModule,
    DropdownModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    TranslateModule,
    ZidShellComponent,
    ZidEmptyStateComponent,
    ZidSkeletonComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './zid-orders.component.html',
  styleUrls: ['../zid-integration.shared.scss']
})
export class ZidOrdersComponent implements OnInit {
  loading = signal(false);
  detailsLoading = signal(false);
  actionLoading = signal('');
  error = signal('');
  orders = signal<ZidOrder[]>([]);
  totalRecords = signal(0);
  selectedOrder = signal<ZidOrder | null>(null);

  showDetailsDialog = false;
  page = 1;
  pageSize = 20;
  filterStatus: ZidOrderStatus | null = null;
  filterSyncStatus: ZidSyncStatus | null = null;
  storeDetailsId = '';
  nextStatus: ZidOrderStatus = ZidOrderStatus.InProgress;

  statusOptions: Array<{ label: string; value: ZidOrderStatus | null }> = [];
  syncOptions: Array<{ label: string; value: ZidSyncStatus | null }> = [];
  updateStatusOptions: Array<{ label: string; value: ZidOrderStatus }> = [];

  ZidSyncStatus = ZidSyncStatus;

  constructor(
    private zidOrders: ZidOrdersService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.configureOptions();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.configureOptions());
    this.loadOrders();
  }

  private configureOptions(): void {
    this.statusOptions = [
      { label: this.t('ALL'), value: null },
      { label: this.t('STATUS_NEW'), value: ZidOrderStatus.New },
      { label: this.t('STATUS_IN_PROGRESS'), value: ZidOrderStatus.InProgress },
      { label: this.t('STATUS_COMPLETED'), value: ZidOrderStatus.Completed },
      { label: this.t('STATUS_CANCELLED'), value: ZidOrderStatus.Cancelled },
      { label: this.t('STATUS_READY_FOR_SHIPPING'), value: ZidOrderStatus.ReadyForShipping },
      { label: this.t('STATUS_SHIPPED'), value: ZidOrderStatus.Shipped },
      { label: this.t('STATUS_DELIVERED'), value: ZidOrderStatus.Delivered }
    ];

    this.syncOptions = [
      { label: this.t('ALL'), value: null },
      { label: this.t('SYNC_PENDING'), value: ZidSyncStatus.Pending },
      { label: this.t('SYNC_SYNCED'), value: ZidSyncStatus.Synced },
      { label: this.t('SYNC_FAILED'), value: ZidSyncStatus.Failed },
      { label: this.t('SYNC_SKIPPED'), value: ZidSyncStatus.Skipped }
    ];

    this.updateStatusOptions = [
      { label: this.t('STATUS_IN_PROGRESS'), value: ZidOrderStatus.InProgress },
      { label: this.t('STATUS_COMPLETED'), value: ZidOrderStatus.Completed },
      { label: this.t('STATUS_CANCELLED'), value: ZidOrderStatus.Cancelled },
      { label: this.t('STATUS_SHIPPED'), value: ZidOrderStatus.Shipped },
      { label: this.t('STATUS_DELIVERED'), value: ZidOrderStatus.Delivered }
    ];
  }

  loadOrders(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.zidOrders.getOrders({
      page: this.page,
      pageSize: this.pageSize,
      status: this.filterStatus,
      syncStatus: this.filterSyncStatus
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.orders.set(response.items);
          this.totalRecords.set(response.totalCount);
          this.loading.set(false);
        },
        error: error => {
          this.orders.set([]);
          this.totalRecords.set(0);
          this.error.set(this.readError(error, this.t('LOAD_ORDERS_ERROR')));
          this.loading.set(false);
        }
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadOrders();
  }

  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.loadOrders();
  }

  viewDetails(order: ZidOrder): void {
    this.showDetailsDialog = true;
    this.detailsLoading.set(true);
    this.selectedOrder.set(null);

    this.zidOrders.getOrderDetails(order.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: details => {
          this.selectedOrder.set(details);
          this.nextStatus = this.suggestNextStatus(details.status);
          this.detailsLoading.set(false);
        },
        error: error => {
          this.showDetailsDialog = false;
          this.detailsLoading.set(false);
          this.showError(this.readError(error, this.t('LOAD_ORDER_DETAILS_ERROR')));
        }
      });
  }

  syncSelectedOrder(): void {
    const order = this.selectedOrder();
    const storeId = this.storeDetailsId.trim() || order?.storeDetailsId || '';
    if (!order) return;
    if (!storeId) {
      this.showError(this.t('STORE_DETAILS_REQUIRED_FOR_SYNC'));
      return;
    }

    this.confirmationService.confirm({
      header: this.t('CONFIRM_SYNC'),
      message: this.translate.instant('CASHIER_ZID.CONFIRM_SYNC_ORDER_MESSAGE', { reference: order.referenceNumber }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.actionLoading.set('sync');
        this.zidOrders.syncOrder(order.id, storeId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: response => {
              this.actionLoading.set('');
              this.showSuccess(response.message || this.t('ORDER_SYNCED'));
              this.showDetailsDialog = false;
              this.loadOrders();
            },
            error: error => {
              this.actionLoading.set('');
              this.showError(this.readError(error, this.t('SYNC_ORDER_ERROR')));
            }
          });
      }
    });
  }

  updateSelectedOrderStatus(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.confirmationService.confirm({
      header: this.t('CONFIRM_STATUS_UPDATE'),
      message: this.translate.instant('CASHIER_ZID.CONFIRM_STATUS_UPDATE_MESSAGE', {
        reference: order.referenceNumber,
        status: this.orderStatusLabel(this.nextStatus)
      }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.actionLoading.set('status');
        this.zidOrders.updateOrderStatus(order.id, this.nextStatus)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: response => {
              this.actionLoading.set('');
              this.showSuccess(response.message || this.t('ORDER_STATUS_UPDATED'));
              this.viewDetails(order);
              this.loadOrders();
            },
            error: error => {
              this.actionLoading.set('');
              this.showError(this.readError(error, this.t('UPDATE_STATUS_ERROR')));
            }
          });
      }
    });
  }

  isBusy(key: string): boolean {
    return this.actionLoading() === key;
  }

  orderStatusSeverity = getZidOrderStatusSeverity;
  syncStatusSeverity = getZidSyncStatusSeverity;
  paymentSeverity = getZidPaymentStatusSeverity;

  orderStatusLabel(status: ZidOrderStatus): string {
    const keyMap: Record<ZidOrderStatus, string> = {
      [ZidOrderStatus.New]: 'STATUS_NEW',
      [ZidOrderStatus.InProgress]: 'STATUS_IN_PROGRESS',
      [ZidOrderStatus.Completed]: 'STATUS_COMPLETED',
      [ZidOrderStatus.Cancelled]: 'STATUS_CANCELLED',
      [ZidOrderStatus.Refunded]: 'STATUS_REFUNDED',
      [ZidOrderStatus.ReadyForShipping]: 'STATUS_READY_FOR_SHIPPING',
      [ZidOrderStatus.Shipped]: 'STATUS_SHIPPED',
      [ZidOrderStatus.Delivered]: 'STATUS_DELIVERED'
    };
    return this.t(keyMap[status] || 'UNKNOWN');
  }

  syncStatusLabel(status: ZidSyncStatus): string {
    const keyMap: Record<ZidSyncStatus, string> = {
      [ZidSyncStatus.Pending]: 'SYNC_PENDING',
      [ZidSyncStatus.Synced]: 'SYNC_SYNCED',
      [ZidSyncStatus.Failed]: 'SYNC_FAILED',
      [ZidSyncStatus.Skipped]: 'SYNC_SKIPPED'
    };
    return this.t(keyMap[status] || 'UNKNOWN');
  }

  paymentStatusLabel(order: ZidOrder): string {
    const keyMap: Record<ZidPaymentStatus, string> = {
      [ZidPaymentStatus.Paid]: 'PAYMENT_PAID',
      [ZidPaymentStatus.Unpaid]: 'PAYMENT_UNPAID',
      [ZidPaymentStatus.PartiallyPaid]: 'PAYMENT_PARTIALLY_PAID',
      [ZidPaymentStatus.Refunded]: 'PAYMENT_REFUNDED',
      [ZidPaymentStatus.Unknown]: 'UNKNOWN'
    };
    return this.t(keyMap[order.paymentStatus] || 'UNKNOWN');
  }

  countBySyncStatus(status: ZidSyncStatus): number {
    return this.orders().filter(order => order.syncStatus === status).length;
  }

  countByOrderStatus(status: ZidOrderStatus): number {
    return this.orders().filter(order => order.status === status).length;
  }

  allItemsMapped(order: ZidOrder): boolean {
    return order.items.length > 0 && order.items.every(item => item.isMapped);
  }

  private suggestNextStatus(status: ZidOrderStatus): ZidOrderStatus {
    if (status === ZidOrderStatus.New) return ZidOrderStatus.InProgress;
    if (status === ZidOrderStatus.InProgress) return ZidOrderStatus.Completed;
    if (status === ZidOrderStatus.ReadyForShipping) return ZidOrderStatus.Shipped;
    if (status === ZidOrderStatus.Shipped) return ZidOrderStatus.Delivered;
    return ZidOrderStatus.Completed;
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 3500 });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 5500 });
  }

  private readError(error: any, fallback: string): string {
    return mapError(error, fallback);
  }

  private t(key: string): string {
    return this.translate.instant(`CASHIER_ZID.${key}`);
  }
}
