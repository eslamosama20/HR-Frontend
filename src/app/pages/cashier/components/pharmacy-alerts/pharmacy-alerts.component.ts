import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PharmacySupportApiService } from 'src/app/services/cashier/pharmacy-support-api.service';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type AlertType = 'stock' | 'expiry' | 'temperature' | 'interaction' | 'insurance';
type AlertLevel = 'critical' | 'high' | 'medium' | 'low';
type AlertState = 'new' | 'in_progress' | 'closed';
type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

interface PharmacyAlertItem {
  id: string;
  code: string;
  type: AlertType;
  level: AlertLevel;
  state: AlertState;
  title: string;
  message: string;
  branch: string;
  owner: string;
  referenceNo: string;
  sourcePage: string;
  actionTaken: string;
  closedAt: Date | null;
  closedBy: string;
  createdAt: Date;
}

interface AlertActionDraft {
  owner: string;
  state: AlertState;
  actionTaken: string;
}

interface AlertCreateDraft {
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  branch: string;
  referenceNo: string;
  sourcePage: string;
}

@Component({
  selector: 'app-pharmacy-alerts',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    TagModule,
    ToastModule,
    DialogModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './pharmacy-alerts.component.html',
  styleUrls: ['./pharmacy-alerts.component.scss']
})
export class PharmacyAlertsComponent implements OnInit {
  alerts = signal<PharmacyAlertItem[]>([]);
  selectedAlert = signal<PharmacyAlertItem | null>(null);

  searchTerm = '';
  selectedLevel: AlertLevel | 'all' = 'all';
  selectedState: AlertState | 'all' = 'all';

  showDetailsDialog = false;
  showActionDialog = false;
  showCreateDialog = false;

  actionAlertId: string | null = null;
  actionDraft: AlertActionDraft = this.createEmptyActionDraft();
  createDraft: AlertCreateDraft = this.createEmptyCreateDraft();

  get ownerOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_ALERTS.OWNER_UNASSIGNED'), value: 'غير مسند' },
      { label: this.translateService.instant('PHARMACY_ALERTS.OWNER_CURRENT_PHARMACIST'), value: 'الصيدلي الحالي' },
      { label: this.translateService.instant('PHARMACY_ALERTS.OWNER_QUALITY_TEAM'), value: 'فريق الجودة' },
      { label: this.translateService.instant('PHARMACY_ALERTS.OWNER_STORE_MANAGER'), value: 'مسؤول المخزن' }
    ];
  }

  get levelOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_ALERTS.LEVEL_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_ALERTS.LEVEL_CRITICAL'), value: 'critical' },
      { label: this.translateService.instant('PHARMACY_ALERTS.LEVEL_HIGH'), value: 'high' },
      { label: this.translateService.instant('PHARMACY_ALERTS.LEVEL_MEDIUM'), value: 'medium' },
      { label: this.translateService.instant('PHARMACY_ALERTS.LEVEL_LOW'), value: 'low' }
    ];
  }

  get stateOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_ALERTS.STATE_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_ALERTS.STATE_NEW'), value: 'new' },
      { label: this.translateService.instant('PHARMACY_ALERTS.STATE_IN_PROGRESS'), value: 'in_progress' },
      { label: this.translateService.instant('PHARMACY_ALERTS.STATE_CLOSED'), value: 'closed' }
    ];
  }

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private pharmacySupportApiService: PharmacySupportApiService
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  get filteredAlerts(): PharmacyAlertItem[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.alerts().filter(item => {
      const levelMatch = this.selectedLevel === 'all' || item.level === this.selectedLevel;
      const stateMatch = this.selectedState === 'all' || item.state === this.selectedState;
      const textMatch = !keyword || `${item.code} ${item.title} ${item.message} ${item.branch} ${item.referenceNo}`
        .toLowerCase()
        .includes(keyword);
      return levelMatch && stateMatch && textMatch;
    });
  }

  get criticalCount(): number {
    return this.alerts().filter(item => item.level === 'critical' && item.state !== 'closed').length;
  }

  get newCount(): number {
    return this.alerts().filter(item => item.state === 'new').length;
  }

  get inProgressCount(): number {
    return this.alerts().filter(item => item.state === 'in_progress').length;
  }

  loadAlerts(): void {
    this.pharmacySupportApiService.getAlerts(1, 100).subscribe({
      next: (alerts) => {
        this.alerts.set(alerts as unknown as PharmacyAlertItem[]);
      },
      error: () => {
        this.alerts.set([]);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_ALERTS.ERR_LOAD_ALERTS')
        });
      }
    });
  }

  openDetails(alert: PharmacyAlertItem): void {
    this.pharmacySupportApiService.getAlertById(alert.id).subscribe({
      next: (response) => {
        this.selectedAlert.set({
          ...alert,
          ...response
        } as PharmacyAlertItem);
        this.showDetailsDialog = true;
      },
      error: () => {
        this.selectedAlert.set(alert);
        this.showDetailsDialog = true;
      }
    });
  }

  openCreateAlert(): void {
    this.createDraft = this.createEmptyCreateDraft();
    this.showCreateDialog = true;
  }

  saveAlert(): void {
    if (!this.createDraft.title || !this.createDraft.message) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_ALERTS.ERR_INCOMPLETE_FIELDS')
      });
      return;
    }

    this.pharmacySupportApiService.createAlert({
      type: this.createDraft.type,
      level: this.createDraft.level,
      title: this.createDraft.title,
      message: this.createDraft.message,
      branch: this.createDraft.branch || '',
      referenceNo: this.createDraft.referenceNo || '',
      sourcePage: this.createDraft.sourcePage || ''
    }).subscribe({
      next: () => {
        this.showCreateDialog = false;
        this.loadAlerts();
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_SUCCESS'),
          detail: this.translateService.instant('PHARMACY_ALERTS.SUCCESS_ALERT_CREATED')
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_ALERTS.ERR_CREATE_ALERT_FAILED')
        });
      }
    });
  }

  openActionDialog(alert: PharmacyAlertItem): void {
    this.actionAlertId = alert.id;
    this.selectedAlert.set(alert);
    this.actionDraft = {
      owner: alert.owner,
      state: alert.state,
      actionTaken: alert.actionTaken
    };
    this.showActionDialog = true;
  }

  saveAction(): void {
    const alertId = this.actionAlertId;
    if (!alertId) {
      return;
    }

    this.pharmacySupportApiService.assignAlert(alertId, this.actionDraft.owner || 'الصيدلي الحالي').subscribe({
      next: () => {
        if (this.actionDraft.state === 'closed') {
          this.pharmacySupportApiService.closeAlert(alertId).subscribe({
            next: () => {
              this.showActionDialog = false;
              this.loadAlerts();
              this.messageService.add({
                severity: 'success',
                summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_SUCCESS'),
                detail: this.translateService.instant('PHARMACY_ALERTS.SUCCESS_ALERT_UPDATED')
              });
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_ERROR'),
                detail: this.translateService.instant('PHARMACY_ALERTS.ERR_CLOSE_FAILED')
              });
            }
          });
          return;
        }

        this.showActionDialog = false;
        this.loadAlerts();
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_SUCCESS'),
          detail: this.translateService.instant('PHARMACY_ALERTS.SUCCESS_ALERT_UPDATED')
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_ALERTS.ERR_UPDATE_FAILED')
        });
      }
    });
  }

  assignToCurrentUser(alert: PharmacyAlertItem): void {
    this.pharmacySupportApiService.assignAlert(alert.id, 'الصيدلي الحالي').subscribe({
      next: () => {
        this.loadAlerts();
        this.messageService.add({
          severity: 'info',
          summary: this.translateService.instant('PHARMACY_ALERTS.NOTIFY_ASSIGNED'),
          detail: this.translateService.instant('PHARMACY_ALERTS.NOTIFY_ASSIGN_SUCCESS', { no: alert.code })
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_ALERTS.ERR_ASSIGN_FAILED')
        });
      }
    });
  }

  closeAlert(alert: PharmacyAlertItem): void {
    this.pharmacySupportApiService.closeAlert(alert.id).subscribe({
      next: () => {
        this.loadAlerts();
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_ALERTS.NOTIFY_CLOSED'),
          detail: this.translateService.instant('PHARMACY_ALERTS.NOTIFY_CLOSE_SUCCESS', { no: alert.code })
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_ALERTS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_ALERTS.ERR_CLOSE_FAILED_GENERIC')
        });
      }
    });
  }

  getTypeLabel(type: AlertType): string {
    const labels: Record<AlertType, string> = {
      stock: this.translateService.instant('PHARMACY_ALERTS.TYPE_STOCK'),
      expiry: this.translateService.instant('PHARMACY_ALERTS.TYPE_EXPIRY'),
      temperature: this.translateService.instant('PHARMACY_ALERTS.TYPE_TEMP'),
      interaction: this.translateService.instant('PHARMACY_ALERTS.TYPE_INTERACTION'),
      insurance: this.translateService.instant('PHARMACY_ALERTS.TYPE_INSURANCE')
    };
    return labels[type];
  }

  getOwnerLabel(owner: string): string {
    if (!owner) return this.translateService.instant('PHARMACY_ALERTS.OWNER_UNASSIGNED');
    const option = this.ownerOptions.find(opt => opt.value === owner);
    return option ? option.label : owner;
  }

  getLevelLabel(level: AlertLevel): string {
    const labels: Record<AlertLevel, string> = {
      critical: this.translateService.instant('PHARMACY_ALERTS.LEVEL_CRITICAL'),
      high: this.translateService.instant('PHARMACY_ALERTS.LEVEL_HIGH'),
      medium: this.translateService.instant('PHARMACY_ALERTS.LEVEL_MEDIUM'),
      low: this.translateService.instant('PHARMACY_ALERTS.LEVEL_LOW')
    };
    return labels[level];
  }

  getLevelTag(level: AlertLevel): TagSeverity {
    const map: Record<AlertLevel, TagSeverity> = {
      critical: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'secondary'
    };
    return map[level];
  }

  getStateLabel(state: AlertState): string {
    const labels: Record<AlertState, string> = {
      new: this.translateService.instant('PHARMACY_ALERTS.STATE_NEW'),
      in_progress: this.translateService.instant('PHARMACY_ALERTS.STATE_IN_PROGRESS'),
      closed: this.translateService.instant('PHARMACY_ALERTS.STATE_CLOSED')
    };
    return labels[state];
  }

  getStateTag(state: AlertState): TagSeverity {
    const map: Record<AlertState, TagSeverity> = {
      new: 'warning',
      in_progress: 'info',
      closed: 'success'
    };
    return map[state];
  }

  private createEmptyActionDraft(): AlertActionDraft {
    return {
      owner: 'غير مسند',
      state: 'new',
      actionTaken: ''
    };
  }

  private createEmptyCreateDraft(): AlertCreateDraft {
    return {
      type: 'stock',
      level: 'medium',
      title: '',
      message: '',
      branch: '',
      referenceNo: '',
      sourcePage: ''
    };
  }

  private findAlertById(alertId: string): PharmacyAlertItem | undefined {
    return this.alerts().find(item => item.id === alertId);
  }

}
