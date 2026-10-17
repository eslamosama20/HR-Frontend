import { Component, DestroyRef, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import {
  DiningTable,
  OrderSource,
  RestaurantOrder,
  RestaurantOrderStatus
} from 'src/app/models/cashier/restaurant-mode.model';
import { RestaurantModeService } from 'src/app/services/cashier/restaurant-mode.service';

@Component({
  selector: 'app-live-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DropdownModule,
    InputNumberModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './live-orders.component.html',
  styleUrls: ['./live-orders.component.scss']
})
export class LiveOrdersComponent implements OnInit, OnDestroy {
  readonly orderStatus = RestaurantOrderStatus;

  orders = signal<RestaurantOrder[]>([]);
  tables = signal<DiningTable[]>([]);
  now = signal<number>(Date.now());

  selectedStatus: RestaurantOrderStatus | 'all' = 'all';
  selectedSource: OrderSource | 'all' = 'all';
  searchTerm = '';
  prepMinutesByOrder: Record<number, number> = {};
  private clockInterval?: ReturnType<typeof setInterval>;

  constructor(
    private restaurantModeService: RestaurantModeService,
    private messageService: MessageService,
    private translateService: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  get statusOptions(): Array<{ label: string; value: RestaurantOrderStatus | 'all' }> {
    return [
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.ALL_STATUS'), value: 'all' },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_NEW'), value: RestaurantOrderStatus.New },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_PREPARING'), value: RestaurantOrderStatus.Preparing },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_READY'), value: RestaurantOrderStatus.Ready },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_SERVED'), value: RestaurantOrderStatus.Served },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_PAID'), value: RestaurantOrderStatus.Paid }
    ];
  }

  get sourceOptions(): Array<{ label: string; value: OrderSource | 'all' }> {
    return [
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.ALL_SOURCES'), value: 'all' },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.SOURCE_SELF'), value: OrderSource.SelfService },
      { label: this.translateService.instant('CASHIER_LIVE_ORDERS.SOURCE_CASHIER'), value: OrderSource.Cashier }
    ];
  }

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.now.set(Date.now());
    }, 15_000);

    this.restaurantModeService.orders$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(orders => {
        this.orders.set([...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      });

    this.restaurantModeService.tables$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tables => {
        this.tables.set(tables);
      });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  get filteredOrders(): RestaurantOrder[] {
    const keyword = this.searchTerm.trim().toLowerCase();

    return this.orders().filter(order => {
      const statusMatch = this.selectedStatus === 'all' || order.status === this.selectedStatus;
      const sourceMatch = this.selectedSource === 'all' || order.source === this.selectedSource;
      const textMatch =
        !keyword ||
        order.orderNo.toLowerCase().includes(keyword) ||
        order.tableNumber.toLowerCase().includes(keyword) ||
        (order.customerName || '').toLowerCase().includes(keyword);

      return statusMatch && sourceMatch && textMatch;
    });
  }

  get newOrdersCount(): number {
    return this.orders().filter(order => order.status === RestaurantOrderStatus.New).length;
  }

  get preparingOrdersCount(): number {
    return this.orders().filter(order => order.status === RestaurantOrderStatus.Preparing).length;
  }

  get readyOrdersCount(): number {
    return this.orders().filter(order => order.status === RestaurantOrderStatus.Ready).length;
  }

  get openOrdersAmount(): number {
    return this.orders()
      .filter(order => order.status !== RestaurantOrderStatus.Paid && order.status !== RestaurantOrderStatus.Cancelled)
      .reduce((sum, order) => sum + order.totalAmount, 0);
  }

  setPreparing(order: RestaurantOrder): void {
    this.restaurantModeService.setOrderPreparationTime(order.id, this.getPreparationMinutes(order));
    this.notifySuccess(this.translateService.instant('CASHIER_LIVE_ORDERS.NOTIFY_PREPARING', { orderNo: order.orderNo }));
  }

  setReady(order: RestaurantOrder): void {
    this.restaurantModeService.updateOrderStatus(order.id, RestaurantOrderStatus.Ready);
    this.notifySuccess(this.translateService.instant('CASHIER_LIVE_ORDERS.NOTIFY_READY', { orderNo: order.orderNo }));
  }

  setServed(order: RestaurantOrder): void {
    this.restaurantModeService.updateOrderStatus(order.id, RestaurantOrderStatus.Served);
    this.notifySuccess(this.translateService.instant('CASHIER_LIVE_ORDERS.NOTIFY_SERVED', { orderNo: order.orderNo }));
  }

  async markPaid(order: RestaurantOrder): Promise<void> {
    const result = await this.restaurantModeService.payOrder(order.id);
    if (result.success) {
      this.notifySuccess(this.translateService.instant('CASHIER_LIVE_ORDERS.NOTIFY_PAID', { orderNo: order.orderNo }));
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
        detail: result.message || this.translateService.instant('CASHIER_LIVE_ORDERS.ERROR_PAY')
      });
    }
  }

  setPreparationTime(order: RestaurantOrder): void {
    const minutes = this.getPreparationMinutes(order);
    const updated = this.restaurantModeService.setOrderPreparationTime(order.id, minutes);
    if (!updated) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_LIVE_ORDERS.ERROR_TIME')
      });
      return;
    }

    this.notifySuccess(this.translateService.instant('CASHIER_LIVE_ORDERS.NOTIFY_TIME_SET', { mins: updated.preparationMinutes, orderNo: order.orderNo }));
  }

  clearAllOrders(): void {
    this.restaurantModeService.clearAllOrders();
    this.messageService.add({
      severity: 'info',
      summary: 'تم المسح',
      detail: 'تم مسح وتصفية جميع الطلبات الحية بنجاح'
    });
  }

  getStatusLabel(status: RestaurantOrderStatus): string {
    const labels: Record<RestaurantOrderStatus, string> = {
      [RestaurantOrderStatus.New]: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_NEW'),
      [RestaurantOrderStatus.Preparing]: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_PREPARING'),
      [RestaurantOrderStatus.Ready]: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_READY'),
      [RestaurantOrderStatus.Served]: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_SERVED'),
      [RestaurantOrderStatus.Paid]: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_PAID'),
      [RestaurantOrderStatus.Cancelled]: this.translateService.instant('CASHIER_LIVE_ORDERS.STATUS_CANCELLED')
    };
    return labels[status];
  }

  getSourceLabel(source: OrderSource): string {
    return source === OrderSource.SelfService 
      ? this.translateService.instant('CASHIER_LIVE_ORDERS.SOURCE_SELF') 
      : this.translateService.instant('CASHIER_LIVE_ORDERS.SOURCE_CASHIER');
  }

  getPreparationMinutes(order: RestaurantOrder): number {
    const selected = this.prepMinutesByOrder[order.id];
    if (Number.isFinite(selected) && selected > 0) {
      return Math.min(180, Math.max(1, Math.round(selected)));
    }

    if (order.preparationMinutes && Number.isFinite(order.preparationMinutes)) {
      return Math.min(180, Math.max(1, Math.round(order.preparationMinutes)));
    }

    return 15;
  }

  onPreparationMinutesChange(order: RestaurantOrder, value: string | number | null | undefined): void {
    const numeric = Number(value);
    this.prepMinutesByOrder[order.id] = Number.isFinite(numeric) && numeric > 0
      ? Math.min(180, Math.max(1, Math.round(numeric)))
      : 15;
  }

  getPreparationStatus(order: RestaurantOrder): string {
    if (order.status === RestaurantOrderStatus.Ready || order.status === RestaurantOrderStatus.Served) {
      return this.translateService.instant('CASHIER_LIVE_ORDERS.PREP_STATUS_DONE');
    }

    if (order.status === RestaurantOrderStatus.Preparing) {
      const remaining = this.getRemainingMinutes(order);
      if (remaining === null) {
        return this.translateService.instant('CASHIER_LIVE_ORDERS.PREP_STATUS_PREPARING');
      }
      return remaining > 0 
        ? this.translateService.instant('CASHIER_LIVE_ORDERS.PREP_STATUS_REMAINING', { mins: remaining }) 
        : this.translateService.instant('CASHIER_LIVE_ORDERS.PREP_STATUS_ABOUT_READY');
    }

    if (order.status === RestaurantOrderStatus.New) {
      return this.translateService.instant('CASHIER_LIVE_ORDERS.PREP_STATUS_WAITING');
    }

    return this.translateService.instant('CASHIER_LIVE_ORDERS.PREP_STATUS_NA');
  }

  private getRemainingMinutes(order: RestaurantOrder): number | null {
    const now = this.now();
    if (!order.expectedReadyAt) {
      return null;
    }

    const expectedAt = order.expectedReadyAt instanceof Date
      ? order.expectedReadyAt.getTime()
      : new Date(order.expectedReadyAt).getTime();

    if (!Number.isFinite(expectedAt)) {
      return null;
    }

    return Math.max(0, Math.ceil((expectedAt - now) / 60_000));
  }

  trackByOrder(_: number, order: RestaurantOrder): number {
    return order.id;
  }

  private notifySuccess(detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_SESSION.SUCCESS'),
      detail
    });
  }
}
