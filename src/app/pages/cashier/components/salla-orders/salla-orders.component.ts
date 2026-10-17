import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

import { CashierService } from 'src/app/services/cashier/cashier.service';
import { SallaIntegrationService } from 'src/app/services/cashier/salla-integration.service';
import {
  SallaOrder,
  SallaOrderStatus,
  SallaSyncStatus,
  SallaPaymentStatus,
  SallaSettings
} from 'src/app/models/cashier/salla-integration.model';
import { PharmacySimulationService } from 'src/app/services/cashier/pharmacy-simulation.service';
import { mapApiToSallaOrderViewModel } from 'src/app/adapters/cashier/salla-orders.adapter';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-salla-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './salla-orders.component.html',
  styleUrls: ['./salla-orders.component.scss']
})
export class SallaOrdersComponent implements OnInit {
  // Loading & Error States
  loading = signal<boolean>(true);
  syncing = signal<boolean>(false);
  loadingDetails = signal<boolean>(false);
  settingsLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  settingsError = signal<boolean>(false);

  // Data
  settings = signal<SallaSettings | null>(null);
  orders = signal<SallaOrder[]>([]);
  totalOrders = signal<number>(0);

  // Pagination
  page = 1;
  pageSize = 20;

  // Filters
  filterStatus = signal<SallaOrderStatus | null>(null);
  filterSyncStatus = signal<SallaSyncStatus | null>(null);

  statusOptions = [
    { label: 'All', value: null },
    { label: 'New', value: SallaOrderStatus.New },
    { label: 'In Progress', value: SallaOrderStatus.InProgress },
    { label: 'Completed', value: SallaOrderStatus.Completed },
    { label: 'Cancelled', value: SallaOrderStatus.Cancelled }
  ];

  syncStatusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: SallaSyncStatus.Pending },
    { label: 'Synced', value: SallaSyncStatus.Synced },
    { label: 'Failed', value: SallaSyncStatus.Failed }
  ];

  // Dialog State
  showDetailsDialog = false;
  selectedOrder = signal<SallaOrder | null>(null);

  // Enum references for template
  SallaOrderStatus = SallaOrderStatus;
  SallaSyncStatus = SallaSyncStatus;
  SallaPaymentStatus = SallaPaymentStatus;

  constructor(
    private sallaService: SallaIntegrationService,
    private cashierService: CashierService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translateService: TranslateService,
    private destroyRef: DestroyRef,
    private simulationService: PharmacySimulationService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadOrders();
  }

  // ==========================================
  // Data Loading
  // ==========================================

  loadSettings(): void {
    this.settingsLoading.set(true);
    this.settingsError.set(false);

    this.sallaService.getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.settings.set(res);
          this.settingsLoading.set(false);
        },
        error: () => {
          this.settingsError.set(true);
          this.settingsLoading.set(false);
        }
      });
  }

  loadOrders(): void {
    this.loading.set(true);
    this.hasError.set(false);

    const filter = {
      page: this.page,
      pageSize: this.pageSize,
      status: this.filterStatus(),
      syncStatus: this.filterSyncStatus()
    };

    if ((environment as any).simulateBackend) {
      this.simulationService.getSallaOrders({ simulateError: false }).subscribe({
        next: (res) => {
          const mapped = res.map(r => mapApiToSallaOrderViewModel(r));
          const normalized = mapped.map(r => ({
            id: r.id,
            sallaId: Number(r.id),
            referenceNumber: r.referenceId,
            customerName: r.customerName,
            status: r.status === 'new' ? SallaOrderStatus.New : SallaOrderStatus.InProgress,
            paymentStatus: SallaPaymentStatus.Paid,
            syncStatus: SallaSyncStatus.Pending,
            totalAmount: r.total,
            currency: 'SAR',
            paymentMethod: 'Credit',
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.createdAt.toISOString(),
            items: []
          }));
          this.orders.set(normalized as any);
          this.totalOrders.set(normalized.length);
          this.loading.set(false);
        },
        error: () => {
          this.orders.set([]);
          this.totalOrders.set(0);
          this.hasError.set(true);
          this.loading.set(false);
        }
      });
      return;
    }

    this.sallaService.getOrders(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.orders.set(res.items);
          this.totalOrders.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.orders.set([]);
          this.totalOrders.set(0);
          this.hasError.set(true);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_ERROR'),
            detail: this.translateService.instant('CASHIER_POS.SALLA_TOAST_LOAD_ORDERS_FAIL'),
            life: 5000
          });
        }
      });
  }

  retryLoad(): void {
    this.loadSettings();
    this.loadOrders();
  }

  // ==========================================
  // Filters & Pagination
  // ==========================================

  onFilterChange(): void {
    this.page = 1;
    this.loadOrders();
  }

  onPageChange(event: any): void {
    this.page = (event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.loadOrders();
  }

  // ==========================================
  // Order Details
  // ==========================================

  viewOrderDetails(order: SallaOrder): void {
    this.loadingDetails.set(true);
    this.selectedOrder.set(null);
    this.showDetailsDialog = true;

    this.sallaService.getOrderDetails(order.id)
      .subscribe({
        next: (details) => {
          this.selectedOrder.set(details);
          this.loadingDetails.set(false);
        },
        error: () => {
          this.loadingDetails.set(false);
          this.showDetailsDialog = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_ERROR'),
            detail: this.translateService.instant('CASHIER_POS.SALLA_TOAST_DETAILS_FAIL'),
            life: 4000
          });
        }
      });
  }

  // ==========================================
  // Sync to Invoice (with Confirmation)
  // ==========================================

  confirmSyncToInvoice(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.confirmationService.confirm({
      message: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_SYNC_MSG', {
        ref: order.referenceNumber
      }),
      header: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_SYNC_HEADER'),
      icon: 'pi pi-file',
      acceptLabel: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_YES'),
      rejectLabel: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_NO'),
      accept: () => this.executeSyncToInvoice()
    });
  }

  private executeSyncToInvoice(): void {
    const order = this.selectedOrder();
    if (!order) return;

    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    if (!currentSession?.storeDetailsId) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_ERROR'),
        detail: this.translateService.instant('CASHIER_POS.SALLA_NO_SESSION'),
        life: 5000
      });
      return;
    }
    const storeDetailsId = currentSession.storeDetailsId;

    this.syncing.set(true);
    this.sallaService.syncToInvoice(order.id, { storeDetailsId })
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_SUCCESS'),
            detail: this.translateService.instant('CASHIER_POS.SALLA_TOAST_SYNC_SUCCESS'),
            life: 4000
          });
          this.showDetailsDialog = false;
          this.syncing.set(false);
          this.loadOrders();
          this.loadSettings();
        },
        error: (err) => {
          const backendMsg = err.error?.error || err.error?.message;
          const detail = backendMsg
            || this.translateService.instant('CASHIER_POS.SALLA_TOAST_SYNC_FAIL');

          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_SYNC_FAIL_HEADER'),
            detail,
            life: 6000
          });
          this.syncing.set(false);
        }
      });
  }

  // ==========================================
  // Update Order Status (with Confirmation)
  // ==========================================

  confirmUpdateStatus(status: SallaOrderStatus): void {
    const order = this.selectedOrder();
    if (!order) return;

    const statusLabel = SallaOrderStatus[status];

    this.confirmationService.confirm({
      message: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_STATUS_MSG', {
        ref: order.referenceNumber,
        status: statusLabel
      }),
      header: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_STATUS_HEADER'),
      icon: 'pi pi-info-circle',
      acceptLabel: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_YES'),
      rejectLabel: this.translateService.instant('CASHIER_POS.SALLA_CONFIRM_NO'),
      accept: () => this.executeUpdateStatus(status)
    });
  }

  private executeUpdateStatus(status: SallaOrderStatus): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.syncing.set(true);
    this.sallaService.updateOrderStatus(order.id, { status })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_SUCCESS'),
            detail: this.translateService.instant('CASHIER_POS.SALLA_TOAST_STATUS_SUCCESS'),
            life: 4000
          });

          // Update local state
          order.status = status;
          this.selectedOrder.set({ ...order });
          this.syncing.set(false);
          this.loadOrders();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_POS.SALLA_TOAST_ERROR'),
            detail: this.translateService.instant('CASHIER_POS.SALLA_TOAST_STATUS_FAIL'),
            life: 4000
          });
          this.syncing.set(false);
        }
      });
  }

  // ==========================================
  // UI Helpers
  // ==========================================

  getOrderStatusSeverity(status: SallaOrderStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case SallaOrderStatus.New: return 'info';
      case SallaOrderStatus.InProgress: return 'warning';
      case SallaOrderStatus.Completed: return 'success';
      case SallaOrderStatus.Cancelled: return 'danger';
      case SallaOrderStatus.Refunded: return 'danger';
      default: return 'info';
    }
  }

  getOrderStatusLabel(status: SallaOrderStatus): string {
    return SallaOrderStatus[status] || 'Unknown';
  }

  getSyncSeverity(status: SallaSyncStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case SallaSyncStatus.Pending: return 'warning';
      case SallaSyncStatus.Synced: return 'success';
      case SallaSyncStatus.Failed: return 'danger';
      default: return 'info';
    }
  }

  getSyncLabel(status: SallaSyncStatus): string {
    return SallaSyncStatus[status] || 'Unknown';
  }

  getPaymentSeverity(status: SallaPaymentStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return status === SallaPaymentStatus.Paid ? 'success' : 'warning';
  }

  areAllItemsMapped(): boolean {
    const order = this.selectedOrder();
    if (!order || !order.items) return false;
    return order.items.every(item => item.isMapped);
  }
}
