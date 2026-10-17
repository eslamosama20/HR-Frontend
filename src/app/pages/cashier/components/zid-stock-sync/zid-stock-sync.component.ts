import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ZidStockSyncResult } from 'src/app/models/cashier/zid-integration.model';
import { ZidStockSyncService } from 'src/app/services/cashier/zid-stock-sync.service';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { ZidShellComponent } from '../zid-shared/zid-shell.component';
import { ZidEmptyStateComponent } from '../zid-shared/zid-empty-state.component';

@Component({
  selector: 'app-zid-stock-sync',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TableModule,
    ToastModule,
    TranslateModule,
    ZidShellComponent,
    ZidEmptyStateComponent
  ],
  providers: [MessageService],
  templateUrl: './zid-stock-sync.component.html',
  styleUrls: ['../zid-integration.shared.scss']
})
export class ZidStockSyncComponent implements OnInit {
  actionLoading = signal('');
  result = signal<ZidStockSyncResult | null>(null);
  error = signal('');

  storeDetailsId = '';
  zidProductId = '';
  quantity: number | null = null;

  constructor(
    private stockSync: ZidStockSyncService,
    private cashierService: CashierService,
    private messageService: MessageService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.storeDetailsId = this.cashierService.getCurrentSessionSnapshot()?.storeDetailsId || '';
  }

  syncAllStock(): void {
    const storeId = this.storeDetailsId.trim();
    if (!storeId) {
      this.showError(this.t('STORE_DETAILS_REQUIRED'));
      return;
    }

    this.error.set('');
    this.actionLoading.set('syncAll');
    this.stockSync.syncAllStock(storeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.result.set(result);
          this.actionLoading.set('');
          this.showSuccess(this.t('STOCK_SYNC_COMPLETED'));
        },
        error: error => {
          this.result.set(null);
          this.error.set(this.readError(error, this.t('STOCK_SYNC_ERROR')));
          this.actionLoading.set('');
        }
      });
  }

  updateSingleStock(): void {
    const productId = this.zidProductId.trim();
    if (!productId) {
      this.showError(this.t('PRODUCT_ID_REQUIRED'));
      return;
    }
    if (this.quantity === null || this.quantity < 0) {
      this.showError(this.t('QUANTITY_INVALID'));
      return;
    }

    this.actionLoading.set('single');
    this.stockSync.updateProductStock(productId, this.quantity)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.actionLoading.set('');
          this.showSuccess(response.message || this.t('SINGLE_STOCK_UPDATED'));
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('SINGLE_STOCK_ERROR')));
        }
      });
  }

  isBusy(key: string): boolean {
    return this.actionLoading() === key;
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 3500 });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 5500 });
  }

  private readError(error: any, fallback: string): string {
    return error?.error?.message ?? error?.error?.error ?? error?.message ?? fallback;
  }

  private t(key: string): string {
    return this.translate.instant(`CASHIER_ZID.${key}`);
  }
}
