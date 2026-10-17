import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import {
  CreateInsuranceClaimRequest,
  InsuranceClaimViewModel,
  formatInsuranceApiError
} from 'src/app/adapters/pharmacy/insurance-claims.adapter';
import {
  ClaimTagSeverity,
  LocalInsuranceClaimStatus,
  NphiesClaimStatus,
  localStatusSeverity,
  nphiesStatusSeverity
} from 'src/app/adapters/pharmacy/nphies-claim-status.adapter';
import { PharmacySupportApiService } from 'src/app/services/cashier/pharmacy-support-api.service';
import { mapError } from 'src/app/shared/utils/runtime-error.util';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
interface ClaimDraft {
  rxNo: string;
  prescriptionId: string;
  patientName: string;
  insurer: string;
  totalAmount: number;
  referenceNo: string;
  notes: string;
}

interface StatusDraft {
  status: LocalInsuranceClaimStatus;
  approvedAmount: number;
  notes: string;
}

@Component({
  selector: 'app-pharmacy-insurance',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
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
  templateUrl: './pharmacy-insurance.component.html',
  styleUrls: ['./pharmacy-insurance.component.scss']
})
export class PharmacyInsuranceComponent implements OnInit {
  loading = signal(false);
  actionLoading = signal<string | null>(null);
  claims = signal<InsuranceClaimViewModel[]>([]);
  selectedClaim = signal<InsuranceClaimViewModel | null>(null);
  totalClaims = signal(0);
  errorMessage = signal<string | null>(null);

  searchTerm = '';
  selectedInsurer = 'all';
  selectedStatus: 'all' | LocalInsuranceClaimStatus | NphiesClaimStatus = 'all';

  showDetailsDialog = false;
  showClaimDialog = false;
  showStatusDialog = false;

  statusClaimId: string | null = null;

  claimDraft: ClaimDraft = this.createEmptyClaimDraft();
  statusDraft: StatusDraft = this.createEmptyStatusDraft();

  get insurerMasterOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_INSURANCE.INSURER_BUPA'), value: 'Bupa Arabia' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.INSURER_TAWUNIYA'), value: 'Tawuniya' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.INSURER_MEDGULF'), value: 'MedGulf' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.INSURER_MALATH'), value: 'Malath' }
    ];
  }

  get statusOptions(): Array<{ label: string; value: 'all' | LocalInsuranceClaimStatus | NphiesClaimStatus }> {
    const localPrefix = this.translateService.instant('PHARMACY_INSURANCE.STATUS_LOCAL_PREFIX');
    const nphiesPrefix = this.translateService.instant('PHARMACY_INSURANCE.STATUS_NPHIES_PREFIX');
    return [
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_ALL_LABEL'), value: 'all' },
      { label: localPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_PENDING'), value: 'Pending' },
      { label: localPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_SUBMITTED'), value: 'Submitted' },
      { label: localPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_APPROVED'), value: 'Approved' },
      { label: localPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_REJECTED'), value: 'Rejected' },
      { label: localPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_PAID'), value: 'Paid' },
      { label: localPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_PARTIAL'), value: 'PartiallyApproved' },
      { label: nphiesPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_PENDING'), value: 'pending' },
      { label: nphiesPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_QUEUED'), value: 'queued' },
      { label: nphiesPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_APPROVED'), value: 'approved' },
      { label: nphiesPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_PARTIAL'), value: 'partial' },
      { label: nphiesPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_REJECTED'), value: 'rejected' },
      { label: nphiesPrefix + this.translateService.instant('PHARMACY_INSURANCE.STATUS_ERROR'), value: 'error' }
    ];
  }

  get localStatusOptions(): Array<{ label: string; value: LocalInsuranceClaimStatus }> {
    return [
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_PENDING'), value: 'Pending' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_SUBMITTED'), value: 'Submitted' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_APPROVED'), value: 'Approved' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_REJECTED'), value: 'Rejected' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_PAID'), value: 'Paid' },
      { label: this.translateService.instant('PHARMACY_INSURANCE.STATUS_PARTIAL'), value: 'PartiallyApproved' }
    ];
  }

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private pharmacySupportApiService: PharmacySupportApiService
  ) {}

  ngOnInit(): void {
    this.loadClaims();
  }

  getInsurerLabel(name: string): string {
    if (!name) return '';
    const option = this.insurerMasterOptions.find(opt => opt.value === name);
    return option ? option.label : name;
  }

  get insurerOptions(): Array<{ label: string; value: string }> {
    const insurers = Array.from(new Set(this.claims().map(item => item.insurer).filter(Boolean)));
    return [
      { label: this.translateService.instant('PHARMACY_INSURANCE.INSURER_ALL'), value: 'all' },
      ...insurers.map(name => ({ label: this.getInsurerLabel(name), value: name }))
    ];
  }

  get filteredClaims(): InsuranceClaimViewModel[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.claims().filter(item => {
      const insurerMatch = this.selectedInsurer === 'all' || item.insurer === this.selectedInsurer;
      const statusMatch =
        this.selectedStatus === 'all' ||
        item.status === this.selectedStatus ||
        item.nphiesStatus === this.selectedStatus;
      const textMatch = !keyword || [
        item.claimNo,
        item.rxNo,
        item.patientName,
        item.insurer,
        item.referenceNo,
        item.nphiesClaimId
      ].join(' ').toLowerCase().includes(keyword);

      return insurerMatch && statusMatch && textMatch;
    });
  }

  get queuedCount(): number {
    return this.claims().filter(
      (item) =>
        item.nphiesStatus === 'queued' ||
        item.nphiesStatus === 'pending' ||
        item.status === 'Pending' ||
        item.status === 'Submitted'
    ).length;
  }

  get approvedCount(): number {
    return this.claims().filter(item => item.nphiesStatus === 'approved' || item.status === 'Approved').length;
  }

  get rejectedCount(): number {
    return this.claims().filter(item => item.nphiesStatus === 'rejected' || item.status === 'Rejected').length;
  }

  get paidCount(): number {
    return this.claims().filter(item => item.status === 'Paid').length;
  }

  get totalCoveredSum(): number {
    return this.claims().reduce((acc, item) => acc + (Number(item.insuranceCoveredAmount) || 0), 0);
  }

  get totalClaimsSum(): number {
    return this.claims().reduce((acc, item) => acc + (Number(item.totalAmount) || 0), 0);
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedInsurer = 'all';
    this.selectedStatus = 'all';
  }

  loadClaims(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.pharmacySupportApiService
      .getInsuranceClaimsPage(1, 100)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.claims.set(page.items);
          this.totalClaims.set(page.total);
        },
        error: (error: HttpErrorResponse) => {
          this.claims.set([]);
          const message = formatInsuranceApiError(error);
          this.errorMessage.set(message);
          this.messageService.add({ severity: 'error', summary: this.translateService.instant('PHARMACY_INSURANCE.PAGE_TITLE'), detail: mapError(error, message) });
        }
      });
  }

  openDetails(claim: InsuranceClaimViewModel): void {
    this.actionLoading.set(`details:${claim.id}`);
    this.pharmacySupportApiService
      .getInsuranceClaimById(claim.id)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: (response) => {
          this.selectedClaim.set(response);
          this.upsertClaim(response);
          this.showDetailsDialog = true;
        },
        error: () => {
          this.selectedClaim.set(claim);
          this.showDetailsDialog = true;
        }
      });
  }

  openNewClaim(): void {
    this.claimDraft = this.createEmptyClaimDraft();
    this.showClaimDialog = true;
  }

  saveClaim(): void {
    if (!this.claimDraft.rxNo || !this.claimDraft.patientName || !this.claimDraft.insurer) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_INSURANCE.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_INSURANCE.ERR_INCOMPLETE_FIELDS')
      });
      return;
    }

    const payload: CreateInsuranceClaimRequest = {
      rxNo: this.claimDraft.rxNo,
      prescriptionId: this.claimDraft.prescriptionId || undefined,
      patientName: this.claimDraft.patientName,
      insurer: this.claimDraft.insurer,
      totalAmount: Number(this.claimDraft.totalAmount) || 0,
      referenceNo: this.claimDraft.referenceNo,
      notes: this.claimDraft.notes
    };

    this.actionLoading.set('create');
    this.pharmacySupportApiService
      .createInsuranceClaim(payload)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: (claim) => {
          this.showClaimDialog = false;
          this.upsertClaim(claim);
          this.messageService.add({ severity: 'success', summary: this.translateService.instant('PHARMACY_INSURANCE.SUCCESS_CLAIM_CREATED'), detail: claim.claimNo || claim.rxNo });
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: this.translateService.instant('PHARMACY_INSURANCE.ERR_CREATE_FAILED'), detail: mapError(error, formatInsuranceApiError(error)) });
        }
      });
  }

  openStatusDialog(claim: InsuranceClaimViewModel): void {
    this.statusClaimId = claim.id;
    this.selectedClaim.set(claim);
    this.statusDraft = {
      status: claim.status,
      approvedAmount: claim.approvedAmount || claim.insuranceCoveredAmount,
      notes: claim.notes
    };
    this.showStatusDialog = true;
  }

  saveStatus(): void {
    const claimId = this.statusClaimId;
    if (!claimId) {
      return;
    }

    this.actionLoading.set(`status:${claimId}`);
    this.pharmacySupportApiService
      .updateInsuranceClaimStatus(claimId, {
        status: this.statusDraft.status,
        approvedAmount: Number(this.statusDraft.approvedAmount) || 0,
        notes: this.statusDraft.notes,
        referenceNo: this.findClaimById(claimId)?.referenceNo || ''
      })
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: () => {
          this.showStatusDialog = false;
          this.loadClaims();
          this.messageService.add({ severity: 'success', summary: this.translateService.instant('PHARMACY_INSURANCE.SUCCESS_STATUS_UPDATED'), detail: this.findClaimById(claimId)?.claimNo ?? '' });
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: this.translateService.instant('PHARMACY_INSURANCE.ERR_UPDATE_FAILED'), detail: mapError(error, formatInsuranceApiError(error)) });
        }
      });
  }

  submitClaim(claim: InsuranceClaimViewModel): void {
    if (!claim.prescriptionId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_INSURANCE.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_INSURANCE.ERR_MISSING_RX')
      });
      return;
    }

    if (!this.canSubmitClaim(claim)) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('PHARMACY_INSURANCE.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_INSURANCE.ERR_ALREADY_SUBMITTED')
      });
      return;
    }

    this.actionLoading.set(`submit:${claim.id}`);
    this.pharmacySupportApiService
      .submitPrescriptionClaim(claim.prescriptionId, {
        saleInvoiceId: claim.saleInvoiceId,
        cashierPaymentId: claim.cashierPaymentId
      })
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: (result) => {
          this.messageService.add({
            severity: result.success ? 'success' : 'warn',
            summary: result.success ? this.translateService.instant('PHARMACY_INSURANCE.SUCCESS_SUBMITTED') : this.translateService.instant('PHARMACY_INSURANCE.TOAST_WARNING'),
            detail: result.messageAr || result.message || result.nphiesStatus
          });
          this.loadClaims();
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: this.translateService.instant('PHARMACY_INSURANCE.ERR_SUBMIT_FAILED'), detail: mapError(error, formatInsuranceApiError(error)) });
        }
      });
  }

  pollNphies(claim: InsuranceClaimViewModel): void {
    this.actionLoading.set(`poll:${claim.id}`);
    this.pharmacySupportApiService
      .pollNphiesClaim(claim.id)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: (updated) => {
          this.upsertClaim(updated.id ? updated : { ...claim, nphiesStatus: updated.nphiesStatus });
          this.messageService.add({
            severity: this.getNphiesStatusTag(updated.nphiesStatus),
            summary: this.translateService.instant('PHARMACY_INSURANCE.SUCCESS_POLL_UPDATED'),
            detail: this.getNphiesStatusLabel(updated.nphiesStatus)
          });
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: this.translateService.instant('PHARMACY_INSURANCE.ERR_POLL_FAILED'), detail: mapError(error, formatInsuranceApiError(error)) });
        }
      });
  }

  updateStatus(claim: InsuranceClaimViewModel, status: LocalInsuranceClaimStatus): void {
    this.statusClaimId = claim.id;
    this.statusDraft = {
      status,
      approvedAmount: status === 'Approved' ? claim.totalAmount : claim.approvedAmount,
      notes: claim.notes
    };
    this.saveStatus();
  }

  canSubmitClaim(claim: InsuranceClaimViewModel): boolean {
    return !!claim.prescriptionId && !['queued', 'approved', 'partial'].includes(claim.nphiesStatus);
  }

  canPollClaim(claim: InsuranceClaimViewModel): boolean {
    return !!claim.id && ['queued', 'pending', 'error'].includes(claim.nphiesStatus);
  }

  isActionLoading(prefix: string, claim?: InsuranceClaimViewModel): boolean {
    const value = this.actionLoading();
    return value === prefix || (!!claim && value === `${prefix}:${claim.id}`);
  }

  getLocalStatusLabel(status: LocalInsuranceClaimStatus): string {
    const keys: Record<LocalInsuranceClaimStatus, string> = {
      Pending: 'PHARMACY_INSURANCE.STATUS_PENDING',
      Submitted: 'PHARMACY_INSURANCE.STATUS_SUBMITTED',
      Approved: 'PHARMACY_INSURANCE.STATUS_APPROVED',
      Rejected: 'PHARMACY_INSURANCE.STATUS_REJECTED',
      Paid: 'PHARMACY_INSURANCE.STATUS_PAID',
      PartiallyApproved: 'PHARMACY_INSURANCE.STATUS_PARTIAL'
    };
    const key = keys[status];
    return key ? this.translateService.instant(key) : status;
  }

  getNphiesStatusLabel(status: NphiesClaimStatus): string {
    const keys: Record<NphiesClaimStatus, string> = {
      pending: 'PHARMACY_INSURANCE.STATUS_PENDING',
      queued: 'PHARMACY_INSURANCE.STATUS_QUEUED',
      approved: 'PHARMACY_INSURANCE.STATUS_APPROVED',
      partial: 'PHARMACY_INSURANCE.STATUS_PARTIAL',
      rejected: 'PHARMACY_INSURANCE.STATUS_REJECTED',
      error: 'PHARMACY_INSURANCE.STATUS_ERROR'
    };
    const key = keys[status];
    return key ? this.translateService.instant(key) : status;
  }

  getLocalStatusTag(status: LocalInsuranceClaimStatus): ClaimTagSeverity {
    return localStatusSeverity(status);
  }

  getNphiesStatusTag(status: NphiesClaimStatus): ClaimTagSeverity {
    return nphiesStatusSeverity(status);
  }

  formatDate(value: Date | null): string {
    return value ? value.toLocaleString() : '-';
  }

  private createEmptyClaimDraft(): ClaimDraft {
    return {
      rxNo: '',
      prescriptionId: '',
      patientName: '',
      insurer: '',
      totalAmount: 0,
      referenceNo: '',
      notes: ''
    };
  }

  private createEmptyStatusDraft(): StatusDraft {
    return {
      status: 'Submitted',
      approvedAmount: 0,
      notes: ''
    };
  }

  private findClaimById(claimId: string): InsuranceClaimViewModel | undefined {
    return this.claims().find(item => item.id === claimId);
  }

  private upsertClaim(claim: InsuranceClaimViewModel): void {
    if (!claim?.id) {
      return;
    }
    this.claims.update(list => {
      const existing = list.some(item => item.id === claim.id);
      return existing
        ? list.map(item => item.id === claim.id ? claim : item)
        : [claim, ...list];
    });
  }
}
