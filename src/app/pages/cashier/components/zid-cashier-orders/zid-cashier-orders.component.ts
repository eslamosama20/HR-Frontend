import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ZidOrdersService } from 'src/app/services/cashier/zid-orders.service';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { ZidCashierOrder, ZidOrderStatus, ZidSyncStatus } from 'src/app/models/cashier/zid-integration.model';
import { getZidOrderStatusSeverity, getZidSyncStatusSeverity } from 'src/app/adapters/cashier/zid-order.adapter';
import { mapError } from 'src/app/shared/utils/runtime-error.util';
import { ZidShellComponent } from '../zid-shared/zid-shell.component';
import { ZidEmptyStateComponent } from '../zid-shared/zid-empty-state.component';
import { ZidSkeletonComponent } from '../zid-shared/zid-skeleton.component';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-zid-cashier-orders',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    TagModule,
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
  templateUrl: './zid-cashier-orders.component.html',
  styleUrls: ['../zid-integration.shared.scss']
})
export class ZidCashierOrdersComponent implements OnInit {
  loading = signal(false);
  actionLoading = signal('');
  error = signal('');
  orders = signal<ZidCashierOrder[]>([]);
  totalRecords = signal(0);

  storeDetailsId = '';

  constructor(
    private zidOrders: ZidOrdersService,
    private cashierService: CashierService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.storeDetailsId = this.cashierService.getCurrentSessionSnapshot()?.storeDetailsId || '';
    if (this.storeDetailsId) {
      this.loadOrders();
    }
  }

  loadOrders(): void {
    if (this.loading()) {
      return;
    }

    const storeId = this.storeDetailsId.trim();
    if (!storeId) {
      this.showError(this.t('STORE_DETAILS_REQUIRED_FOR_CASHIER'));
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.zidOrders.getCashierOrders(storeId)
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
          this.error.set(this.readError(error, this.t('LOAD_CASHIER_ORDERS_ERROR')));
          this.loading.set(false);
        }
      });
  }

  syncToInvoice(order: ZidCashierOrder): void {
    const storeId = this.storeDetailsId.trim();
    if (!storeId) {
      this.showError(this.t('STORE_DETAILS_REQUIRED'));
      return;
    }

    this.confirmationService.confirm({
      header: this.t('CONFIRM_SYNC'),
      message: this.translate.instant('CASHIER_ZID.CONFIRM_CASHIER_SYNC_MESSAGE', { reference: order.referenceNumber }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.actionLoading.set(order.id);
        this.zidOrders.syncOrder(order.id, storeId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: response => {
              this.actionLoading.set('');
              this.showSuccess(response.message || this.t('CASHIER_ORDER_CONVERTED'));
              this.loadOrders();
            },
            error: error => {
              this.actionLoading.set('');
              this.showError(this.readError(error, this.t('CASHIER_SYNC_ERROR')));
            }
          });
      }
    });
  }

  isBusy(orderId: string): boolean {
    return this.actionLoading() === orderId;
  }

  allItemsMapped(order: ZidCashierOrder): boolean {
    return order.items.length > 0 && order.items.every(item => item.isMapped);
  }

  blockedCount(): number {
    return this.orders().filter(order => !this.allItemsMapped(order)).length;
  }

  orderStatusSeverity = getZidOrderStatusSeverity;
  syncStatusSeverity = getZidSyncStatusSeverity;

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
