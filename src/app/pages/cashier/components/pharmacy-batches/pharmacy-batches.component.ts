import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BatchViewModel, mapApiToBatchViewModel, mapBatchError } from 'src/app/adapters/pharmacy/batches.adapter';
import { environment } from 'src/environments/environment';
import { PharmacyInventoryService } from 'src/app/services/cashier/pharmacy-inventory.service';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';


@Component({
  selector: 'app-pharmacy-batches',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pharmacy-batches.component.html',
  styleUrls: ['./pharmacy-batches.component.scss']
})
export class PharmacyBatchesComponent implements OnInit {
  batches = signal<BatchViewModel[]>([]);
  selectedBatch = signal<BatchViewModel | null>(null);
  
  loading = signal(false);
  error = signal<string | null>(null);
  readonly enablePharmacyBatches = (environment as any).enablePharmacyBatches === true;

  searchTerm = '';
  selectedStatus: string | 'all' = 'all';
  selectedStore: string | 'all' = 'all';

  get statusOptions() {
    return [
      { label: 'كل الحالات', value: 'all' },
      { label: this.translateService.instant('PHARMACY_BATCHES.STATUS_OK'), value: 'ok' },
      { label: this.translateService.instant('PHARMACY_BATCHES.STATUS_NEAR_EXPIRY'), value: 'near_expiry' },
      { label: this.translateService.instant('PHARMACY_BATCHES.STATUS_EXPIRED'), value: 'expired' },
      { label: this.translateService.instant('PHARMACY_BATCHES.STATUS_LOW_STOCK'), value: 'low_stock' }
    ];
  }

  get storeOptions() {
    const stores = Array.from(new Set(this.batches().map(b => b.storeName).filter(Boolean)));
    return [
      { label: 'كل المستودعات / المخازن', value: 'all' },
      ...stores.map(s => ({ label: s, value: s }))
    ];
  }

  constructor(
    private translateService: TranslateService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private pharmacyInventoryService: PharmacyInventoryService
  ) {}

  ngOnInit(): void {
    if (this.enablePharmacyBatches) {
      this.loadBatches();
    }
  }

  loadBatches(): void {
    this.loading.set(true);
    this.error.set(null);
    this.pharmacyInventoryService.getAllAvailableBatches().subscribe({
      next: (res) => {
        const mapped = res.map(item => mapApiToBatchViewModel({
          id: item.selectionKey,
          itemCode: item.itemCode,
          itemName: item.itemName,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          quantity: item.availableQuantity,
          minQuantity: 1,
          storeName: item.storeName,
          notes: '',
          isQuarantined: false
        }));
        this.batches.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mapBatchError(err?.error?.errorCode));
        this.loading.set(false);
      }
    });
  }

  get filteredBatches(): BatchViewModel[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.batches().filter(batch => {
      const statusMatch = this.selectedStatus === 'all' || batch.status === this.selectedStatus;
      const storeMatch = this.selectedStore === 'all' || batch.storeName === this.selectedStore;
      const textMatch = !keyword || `${batch.itemCode} ${batch.itemName} ${batch.batchNo} ${batch.storeName}`
        .toLowerCase()
        .includes(keyword);
      return statusMatch && storeMatch && textMatch;
    });
  }

  get totalBatchesCount(): number {
    return this.batches().length;
  }

  get expiredCount(): number {
    return this.batches().filter(batch => batch.status === 'expired').length;
  }

  get nearExpiryCount(): number {
    return this.batches().filter(batch => batch.status === 'near_expiry').length;
  }

  get lowStockCount(): number {
    return this.batches().filter(batch => batch.status === 'low_stock').length;
  }

  get quarantinedCount(): number {
    return this.batches().filter(batch => batch.isQuarantined).length;
  }

  get goodBatchesCount(): number {
    return this.batches().filter(batch => batch.status === 'ok' && !batch.isQuarantined).length;
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedStore = 'all';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ok: this.translateService.instant('PHARMACY_BATCHES.STATUS_OK'),
      near_expiry: this.translateService.instant('PHARMACY_BATCHES.STATUS_NEAR_EXPIRY'),
      expired: this.translateService.instant('PHARMACY_BATCHES.STATUS_EXPIRED'),
      low_stock: this.translateService.instant('PHARMACY_BATCHES.STATUS_LOW_STOCK')
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): TagSeverity {
    const map: Record<string, TagSeverity> = {
      ok: 'success',
      near_expiry: 'warning',
      expired: 'danger',
      low_stock: 'info'
    };
    return map[status];
  }

  getDaysLeft(date: Date): number {
    const diff = date.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getExpiryTone(batch: BatchViewModel): 'danger' | 'warning' | 'info' | 'success' {
    if (batch.status === 'expired') {
      return 'danger';
    }
    if (batch.status === 'near_expiry') {
      return 'warning';
    }
    if (batch.status === 'low_stock') {
      return 'info';
    }
    return 'success';
  }

  getExpiryHint(batch: BatchViewModel): string {
    const daysLeft = this.getDaysLeft(batch.expiryDate);
    if (batch.status === 'expired') {
      return this.translateService.instant('PHARMACY_BATCHES.HINT_EXPIRED');
    }
    if (batch.status === 'near_expiry') {
      return this.translateService.instant('PHARMACY_BATCHES.HINT_DAYS_LEFT', { days: daysLeft });
    }
    if (batch.status === 'low_stock') {
      return this.translateService.instant('PHARMACY_BATCHES.HINT_LOW_STOCK');
    }
    return this.translateService.instant('PHARMACY_BATCHES.HINT_HEALTHY');
  }

  openDetails(batch: BatchViewModel): void {
    this.selectedBatch.set({ ...batch }); // Clone to allow editing notes in sidebar without affecting table until saved
  }

  confirmToggleQuarantine(batch: BatchViewModel): void {
    const willQuarantine = !batch.isQuarantined;
    this.confirmationService.confirm({
      header: willQuarantine 
        ? this.translateService.instant('PHARMACY_BATCHES.CONFIRM_QUARANTINE_HEADER') 
        : this.translateService.instant('PHARMACY_BATCHES.CONFIRM_RELEASE_HEADER'),
      message: willQuarantine
        ? this.translateService.instant('PHARMACY_BATCHES.CONFIRM_QUARANTINE_MSG', { no: batch.batchNo })
        : this.translateService.instant('PHARMACY_BATCHES.CONFIRM_RELEASE_MSG', { no: batch.batchNo }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.toggleQuarantine(batch)
    });
  }

  private toggleQuarantine(batch: BatchViewModel): void {
    const newStatus = !batch.isQuarantined;
    this.batches.update(list => list.map(b => b.id === batch.id ? { ...b, isQuarantined: newStatus } : b));
    if (this.selectedBatch()?.id === batch.id) {
      this.selectedBatch.set({ ...this.selectedBatch()!, isQuarantined: newStatus });
    }
    
    this.messageService.add({
      severity: newStatus ? 'warn' : 'success',
      summary: newStatus 
        ? this.translateService.instant('PHARMACY_BATCHES.TOAST_QUARANTINED_SUMMARY') 
        : this.translateService.instant('PHARMACY_BATCHES.TOAST_RELEASED_SUMMARY'),
      detail: newStatus
        ? this.translateService.instant('PHARMACY_BATCHES.TOAST_QUARANTINED_DETAIL', { no: batch.batchNo })
        : this.translateService.instant('PHARMACY_BATCHES.TOAST_RELEASED_DETAIL', { no: batch.batchNo })
    });
  }

  updateNotes(batchId: string, newNotes: string): void {
    this.batches.update(list => list.map(b => b.id === batchId ? { ...b, notes: newNotes } : b));
    this.messageService.add({ 
      severity: 'info', 
      summary: this.translateService.instant('PHARMACY_BATCHES.TOAST_NOTES_UPDATED_SUMMARY'), 
      detail: this.translateService.instant('PHARMACY_BATCHES.TOAST_NOTES_UPDATED_DETAIL') 
    });
  }

  showExpiredOnly(): void {
    this.selectedStatus = 'expired';
  }

  showNearExpiryOnly(): void {
    this.selectedStatus = 'near_expiry';
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
  }
}
