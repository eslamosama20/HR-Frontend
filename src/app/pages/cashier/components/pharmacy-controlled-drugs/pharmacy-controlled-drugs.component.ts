import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
  AutoCompleteSelectEvent
} from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PharmacySupportApiService } from 'src/app/services/cashier/pharmacy-support-api.service';
import { forkJoin, of, switchMap } from 'rxjs';
import {
  DispenseRestrictedDrugRequestDto,
  RestrictedDrugDispenseDto,
  RestrictedDrugDispenseStatus,
  RestrictedDrugStockItemDto,
  RestrictedDrugsApiService
} from 'src/app/services/cashier/restricted-drugs-api.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { formatDisplayDate } from 'src/app/utils/dateUtils';
import { isPharmacyStore, StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { AuthService } from 'src/app/modules/auth';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

type UiDispenseStatus = RestrictedDrugDispenseStatus | 'all';

interface ControlledRecordDraft {
  recordNo: string;
  prescriptionNo: string;
  patientName: string;
  storeDetailsId: string;
  quantity: number;
  doctorName: string;
  pharmacistName: string;
  authorizationNo: string;
  dispenseReason: string;
}

interface StatusDraft {
  status: RestrictedDrugDispenseStatus;
  rejectionReason: string;
}

@Component({
  selector: 'app-pharmacy-controlled-drugs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    AutoCompleteModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './pharmacy-controlled-drugs.component.html',
  styleUrls: ['./pharmacy-controlled-drugs.component.scss']
})
export class PharmacyControlledDrugsComponent implements OnInit {
  loading = signal<boolean>(false);
  records = signal<RestrictedDrugDispenseDto[]>([]);
  totalRecords = signal<number>(0);
  selectedRecord = signal<RestrictedDrugDispenseDto | null>(null);

  searchTerm = '';
  selectedStatus: UiDispenseStatus = 'all';
  selectedStoreId: string | 'all' | null = 'all';
  page = 1;
  size = 20;

  showDetailsDialog = false;
  showRecordDialog = false;
  showRejectDialog = false;

  editingRecordId: string | null = null;
  statusRecordId: string | null = null;

  recordDraft: ControlledRecordDraft = this.createEmptyRecordDraft();
  statusDraft: StatusDraft = this.createEmptyStatusDraft();

  storeOptions: Array<{ label: string; value: string }> = [];
  storesLoading = false;
  medicationSuggestions: RestrictedDrugStockItemDto[] = [];
  selectedMedicationLine: RestrictedDrugStockItemDto | null = null;
  medicationsLoading = false;

  get statusOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_PENDING'), value: 'pending' },
      { label: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_APPROVED'), value: 'approved' },
      { label: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_REJECTED'), value: 'rejected' },
      { label: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_DISPENSED'), value: 'dispensed' },
      { label: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_CANCELLED'), value: 'cancelled' }
    ];
  }

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private pharmacySupportApiService: PharmacySupportApiService,
    private restrictedDrugsApi: RestrictedDrugsApiService,
    private storeDetailsService: StoreDetailsService,
    public authService: AuthService
  ) {}

  get canDispenseControlled(): boolean {
    return this.authService.hasPermission('Pharmacy.ControlledDrugs.Dispense') || this.authService.hasPermission('Pharmacy.Create');
  }

  get canApproveRejectControlled(): boolean {
    return this.authService.hasPermission('Pharmacy.ControlledDrugs.ApproveReject') || this.authService.hasPermission('Pharmacy.Update');
  }

  get canExportControlledReports(): boolean {
    return this.authService.hasPermission('Pharmacy.ControlledDrugs.ExportReports') || this.authService.hasPermission('Pharmacy.Read');
  }

  ngOnInit(): void {
    this.loadPosStores();
    this.loadRecords(1);
  }

  get totalQuantity(): number {
    return this.records().reduce((total, item) => total + (item.quantity || 0), 0);
  }

  get pendingCount(): number {
    return this.records().filter(r => r.status === 'pending').length;
  }

  get approvedCount(): number {
    return this.records().filter(r => r.status === 'approved').length;
  }

  get dispensedCount(): number {
    return this.records().filter(r => r.status === 'dispensed').length;
  }

  get rejectedCount(): number {
    return this.records().filter(r => r.status === 'rejected').length;
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedStoreId = 'all';
    this.selectedStatus = 'all';
    this.loadRecords(1);
  }

  loadRecords(page: number): void {
    this.loading.set(true);
    this.page = page;

    const storeDetailsId = !this.selectedStoreId || this.selectedStoreId === 'all' ? undefined : this.selectedStoreId;
    const status = this.selectedStatus === 'all' ? undefined : this.selectedStatus;
    const search = this.searchTerm?.trim() || '';

    this.restrictedDrugsApi
      .listDispenses({
        storeDetailsId,
        status: (status ?? '') as any,
        search,
        page: this.page,
        size: this.size
      })
      .subscribe({
        next: (res) => {
          this.records.set(res?.data ?? []);
          this.totalRecords.set(Number(res?.total ?? 0));
          this.loading.set(false);
        },
        error: () => {
          this.records.set([]);
          this.totalRecords.set(0);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_ERROR'),
            detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_LOAD_RECORDS')
          });
        }
      });
  }

  openNewRecord(): void {
    this.editingRecordId = null;
    this.recordDraft = this.createEmptyRecordDraft();
    this.selectedMedicationLine = null;
    this.medicationSuggestions = [];
    this.showRecordDialog = true;
    this.loadPosStores();
  }

  loadPosStores(): void {
    this.storesLoading = true;

    forkJoin({
      posAvailable: this.pharmacySupportApiService.getPosAvailableStores(),
      allStores: this.storeDetailsService.getAll().pipe(switchMap((rows) => of(rows as StoreDetailsModel[])))
    }).subscribe({
      next: ({ posAvailable, allStores }) => {
        this.storesLoading = false;
        const posIds = new Set((posAvailable || []).map((s) => String(s.id)));
        const pharmacyStoreIds = new Set((allStores || []).filter((s) => isPharmacyStore(new StoreDetailsModel(s))).map((s) => String(s.id)));
        const allowed = (posAvailable || []).filter((s) => posIds.has(String(s.id)) && pharmacyStoreIds.has(String(s.id)));

        this.storeOptions = allowed.map((s) => ({
          label: this.currentLangIsAr()
            ? (s.name || s.nameEn || s.code || s.id)
            : (s.nameEn || s.name || s.code || s.id),
          value: String(s.id)
        }));
      },
      error: () => {
        this.storesLoading = false;
        this.storeOptions = [];
        this.messageService.add({
          severity: 'warn',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
          detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_LOAD_STORES')
        });
      }
    });
  }

  onPharmacyStoreChange(storeId: string | null): void {
    const id = `${storeId ?? ''}`.trim();
    this.recordDraft.storeDetailsId = id;
    this.selectedMedicationLine = null;
    this.medicationSuggestions = [];
  }

  filterMedicationLines(event: AutoCompleteCompleteEvent): void {
    const q = (event.query || '').trim().toLowerCase();
    if (!this.recordDraft.storeDetailsId) {
      this.medicationSuggestions = [];
      return;
    }

    this.medicationsLoading = true;
    this.restrictedDrugsApi
      .lookupStock({
        storeDetailsId: this.recordDraft.storeDetailsId,
        search: q
      })
      .subscribe({
        next: (rows) => {
          this.medicationsLoading = false;
          this.medicationSuggestions = rows || [];
        },
        error: () => {
          this.medicationsLoading = false;
          this.medicationSuggestions = [];
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_ERROR'),
            detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_LOOKUP_MEDICATIONS')
          });
        }
      });
  }

  onMedicationPanelOpen(): void {
    if (!this.recordDraft.storeDetailsId) return;
    this.filterMedicationLines({ query: '' } as AutoCompleteCompleteEvent);
  }

  onMedicationSelected(event: AutoCompleteSelectEvent): void {
    this.onMedicationLineModelChange((event?.value as RestrictedDrugStockItemDto) ?? null);
  }

  saveRecord(): void {
    const line = this.selectedMedicationLine;
    const storeId = `${this.recordDraft.storeDetailsId ?? ''}`.trim();

    if (!storeId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_SELECT_STORE_FIRST')
      });
      return;
    }

    if (!line) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_SELECT_MEDICATION_FROM_LIST')
      });
      return;
    }

    const qty = Number(this.recordDraft.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_INVALID_QTY')
      });
      return;
    }

    if (qty > line.availableQty) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_QTY_EXCEEDS_STOCK', { qty: line.availableQty })
      });
      return;
    }

    if (this.isExpired(line.expiryDate)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_EXPIRED_BATCH')
      });
      return;
    }

    if (this.editingRecordId) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_INFO'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_EDIT_NOT_SUPPORTED')
      });
      return;
    }

    const payload: DispenseRestrictedDrugRequestDto = {
      storeDetailsId: storeId,
      itemId: line.itemId || null,
      itemCode: line.itemCode,
      itemName: line.itemName,
      batchNo: line.batchNo ?? null,
      expiryDate: line.expiryDate ?? null,
      quantity: qty,
      patientName: this.recordDraft.patientName?.trim() || '',
      doctorName: this.recordDraft.doctorName?.trim() || '',
      pharmacistName: this.recordDraft.pharmacistName?.trim() || '',
      authorizationNo: this.recordDraft.authorizationNo?.trim() || '',
      dispenseReason: this.recordDraft.dispenseReason?.trim() || '',
      status: 'pending'
    };

    this.restrictedDrugsApi.dispense(payload).subscribe({
      next: () => {
        this.showRecordDialog = false;
        this.loadRecords(1);
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_SUCCESS'),
          detail: this.translateService.instant('PHARMACY_CONTROLLED.SUCCESS_DISPENSE_REGISTERED')
        });
      },
      error: (err: any) => {
        const msg = `${err?.error?.message ?? err?.error?.detail ?? err?.message ?? ''}`.trim();
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_ERROR'),
          detail: msg || this.translateService.instant('PHARMACY_CONTROLLED.ERR_DISPENSE_REGISTER_FAILED')
        });
      }
    });
  }

  openDetails(record: RestrictedDrugDispenseDto): void {
    this.selectedRecord.set(record);
    this.showDetailsDialog = true;
  }

  updateStatus(record: RestrictedDrugDispenseDto, status: RestrictedDrugDispenseStatus): void {
    const id = `${record?.id ?? ''}`.trim();
    if (!id) return;

    if (status === 'rejected') {
      this.statusRecordId = id;
      this.statusDraft = { status: 'rejected', rejectionReason: '' };
      this.showRejectDialog = true;
      return;
    }

    this.restrictedDrugsApi.updateDispenseStatus(id, { status }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_SUCCESS'),
          detail: this.translateService.instant('PHARMACY_CONTROLLED.SUCCESS_STATUS_UPDATED')
        });
        this.loadRecords(this.page);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_STATUS_UPDATE_FAILED')
        });
      }
    });
  }

  confirmReject(): void {
    const id = `${this.statusRecordId ?? ''}`.trim();
    if (!id) return;
    const reason = `${this.statusDraft.rejectionReason ?? ''}`.trim();
    if (!reason) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_REJECTION_REASON_REQUIRED')
      });
      return;
    }
    this.restrictedDrugsApi.updateDispenseStatus(id, { status: 'rejected', rejectionReason: reason }).subscribe({
      next: () => {
        this.showRejectDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_SUCCESS'),
          detail: this.translateService.instant('PHARMACY_CONTROLLED.SUCCESS_RECORD_REJECTED')
        });
        this.loadRecords(this.page);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_CONTROLLED.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_CONTROLLED.ERR_RECORD_REJECT_FAILED')
        });
      }
    });
  }

  getStatusLabel(status: RestrictedDrugDispenseStatus): string {
    const labels: Record<RestrictedDrugDispenseStatus, string> = {
      pending: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_PENDING'),
      approved: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_APPROVED'),
      rejected: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_REJECTED'),
      dispensed: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_DISPENSED'),
      cancelled: this.translateService.instant('PHARMACY_CONTROLLED.STATUS_CANCELLED')
    };
    return labels[status] || status;
  }

  getStatusTag(status: RestrictedDrugDispenseStatus): TagSeverity {
    const map: Record<RestrictedDrugDispenseStatus, TagSeverity> = {
      pending: 'warning',
      approved: 'info',
      rejected: 'danger',
      dispensed: 'success',
      cancelled: 'secondary'
    };
    return map[status];
  }

  getPharmacistName(record: RestrictedDrugDispenseDto): string {
    if (record.pharmacistName && record.pharmacistName.trim() && record.pharmacistName !== '-') {
      return record.pharmacistName;
    }
    if (record.dispensedBy && record.dispensedBy.trim() && record.dispensedBy !== '-') {
      return record.dispensedBy;
    }
    if (record.approvedBy && record.approvedBy.trim() && record.approvedBy !== '-') {
      return record.approvedBy;
    }
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      return currentUser.userName || currentUser.email || '-';
    }
    return '-';
  }

  getStoreName(record: RestrictedDrugDispenseDto): string {
    if (record.storeName && record.storeName.trim() && record.storeName !== '-' && !record.storeName.startsWith('STORE-') && record.storeName !== record.storeDetailsId) {
      return record.storeName;
    }
    const storeId = record.storeDetailsId || (record as any).storeId;
    if (storeId) {
      const match = this.storeOptions.find(opt => String(opt.value) === String(storeId));
      if (match && match.label) {
        return match.label;
      }
    }
    if (record.storeName && record.storeName.trim()) {
      return record.storeName;
    }
    return this.storeOptions[0]?.label || '-';
  }

  formatStockDate(value: string | Date | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return `${value}`;
    }
    return formatDisplayDate(d);
  }

  private currentLangIsAr(): boolean {
    return (this.translateService.currentLang || '').toLowerCase().startsWith('ar');
  }

  private createEmptyRecordDraft(): ControlledRecordDraft {
    return {
      recordNo: '',
      prescriptionNo: '',
      patientName: '',
      storeDetailsId: '',
      quantity: 1,
      doctorName: '',
      pharmacistName: '',
      authorizationNo: '',
      dispenseReason: ''
    };
  }

  private createEmptyStatusDraft(): StatusDraft {
    return {
      status: 'pending',
      rejectionReason: ''
    };
  }

  onMedicationLineModelChange(line: RestrictedDrugStockItemDto | null): void {
    this.selectedMedicationLine = line;
    if (!line) {
      return;
    }
    const max = Number(line.availableQty ?? 0);
    const q = Number(this.recordDraft.quantity);
    if (!Number.isFinite(q) || q > max) {
      this.recordDraft.quantity = max > 0 ? max : 1;
    }
  }

  onSearchOrFilterChange(): void {
    this.loadRecords(1);
  }

  onPageChange(event: any): void {
    const first = Number(event?.first ?? 0);
    const rows = Number(event?.rows ?? this.size);
    const page = Math.floor(first / rows) + 1;
    this.size = rows;
    this.loadRecords(page);
  }

  canApprove(row: RestrictedDrugDispenseDto): boolean {
    return row.status === 'pending';
  }

  canReject(row: RestrictedDrugDispenseDto): boolean {
    return row.status === 'pending' || row.status === 'approved';
  }

  canMarkDispensed(row: RestrictedDrugDispenseDto): boolean {
    return row.status === 'approved';
  }

  canCancel(row: RestrictedDrugDispenseDto): boolean {
    return row.status === 'pending' || row.status === 'approved';
  }

  private isExpired(value: string | null | undefined): boolean {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startExpiry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return startExpiry.getTime() < startToday.getTime();
  }
}
