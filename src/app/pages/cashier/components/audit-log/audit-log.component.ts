import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { CashierAuditLogService } from 'src/app/services/cashier/cashier-audit-log.service';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import {
  CashierAuditLogDto,
  CashierAuditLogFilters,
  CashierAuditLogTypeDto,
  CashierAuditStatsDto
} from 'src/app/models/cashier/cashier-audit-log.model';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type AuditSeverity = 'success' | 'info' | 'warning' | 'danger';

interface AuditMetadataEntry {
  label: string;
  value: string;
}

interface CashierAuditEvent {
  id: number | string;
  occurredAt: Date;
  userName: string;
  roleName: string;
  stationName: string;
  actionType: string;
  severity: AuditSeverity;
  referenceNo?: string;
  amount?: number;
  message: string;
  ipAddress: string;
  metadata: AuditMetadataEntry[];
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
    ToastModule,
    TranslateModule
  ],
  providers: [MessageService],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss']
})
export class AuditLogComponent implements OnInit {
  loading = signal<boolean>(false);
  exporting = signal<boolean>(false);
  events = signal<CashierAuditEvent[]>([]);
  selectedEvent = signal<CashierAuditEvent | null>(null);
  stats = signal<CashierAuditStatsDto | null>(null);

  searchTerm = '';
  selectedType: string | 'all' = 'all';
  selectedSeverity: AuditSeverity | 'all' = 'all';
  selectedUser = 'all';
  fromDate = '';
  toDate = '';

  showDetailsDialog = false;

  typeOptions: Array<{ label: string; value: string | 'all'; severity?: string }> = [
    { label: 'كل العمليات', value: 'all' }
  ];

  readonly severityOptions: Array<{ label: string; value: AuditSeverity | 'all' }> = [
    { label: 'كل المستويات', value: 'all' },
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Critical', value: 'danger' }
  ];

  constructor(
    private messageService: MessageService,
    private auditLogService: CashierAuditLogService,
    private cashierService: CashierService
  ) {}

  ngOnInit(): void {
    this.loadEventTypes();
    this.refreshData();
  }

  get userOptions(): Array<{ label: string; value: string }> {
    const users = Array.from(new Set(this.events().map((event) => event.userName).filter(Boolean))).sort();
    return [
      { label: 'كل المستخدمين', value: 'all' },
      ...users.map((userName) => ({ label: userName, value: userName }))
    ];
  }

  get filteredEvents(): CashierAuditEvent[] {
    return this.events().filter((event) => {
      if (this.selectedSeverity !== 'all' && event.severity !== this.selectedSeverity) {
        return false;
      }
      if (this.selectedUser !== 'all' && event.userName !== this.selectedUser) {
        return false;
      }
      return true;
    });
  }

  get highlightedEvents(): CashierAuditEvent[] {
    return this.filteredEvents
      .filter((event) => event.severity === 'danger' || event.severity === 'warning')
      .slice(0, 6);
  }

  get eventsTodayCount(): number {
    return Number(this.stats()?.total ?? this.filteredEvents.length);
  }

  get warningCount(): number {
    return this.filteredEvents.filter((event) => event.severity === 'warning').length;
  }

  get dangerCount(): number {
    return Number(this.stats()?.critical ?? this.filteredEvents.filter((event) => event.severity === 'danger').length);
  }

  get salesAmount(): number {
    return this.filteredEvents
      .filter((event) => ['SALE_COMPLETED', 'INVOICE_CREATED'].includes(event.actionType))
      .reduce((sum, event) => sum + (event.amount || 0), 0);
  }

  get refundsAmount(): number {
    return this.filteredEvents
      .filter((event) => event.actionType === 'REFUND_CREATED')
      .reduce((sum, event) => sum + (event.amount || 0), 0);
  }

  get distinctUsersCount(): number {
    return new Set(this.filteredEvents.map((event) => event.userName).filter(Boolean)).size;
  }

  refreshData(): void {
    this.loading.set(true);
    const filters = this.buildFilters();
    forkJoin({
      logs: this.auditLogService.getLogs(filters),
      stats: this.auditLogService.getStats(filters).pipe(catchError(() => of(null)))
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ logs, stats }) => {
          this.events.set((logs.items || []).map((event) => this.mapEvent(event)));
          this.stats.set(stats);
        },
        error: () => {
          this.events.set([]);
          this.stats.set(null);
          this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل سجل التدقيق من الخادم.' });
        }
      });
  }

  clearFilters(table?: Table): void {
    if (table) {
      table.clear();
    }
    this.searchTerm = '';
    this.selectedType = 'all';
    this.selectedSeverity = 'all';
    this.selectedUser = 'all';
    this.fromDate = '';
    this.toDate = '';
    this.refreshData();
  }

  openDetails(event: CashierAuditEvent): void {
    this.selectedEvent.set(event);
    this.showDetailsDialog = true;
    this.auditLogService.getLog(event.id).subscribe({
      next: (dto) => this.selectedEvent.set(this.mapEvent(dto)),
      error: () => this.messageService.add({ severity: 'warn', summary: 'تفاصيل السجل', detail: 'تعذر تحميل تفاصيل الحدث.' })
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.auditLogService.exportCsv({ ...this.buildFilters(), pageSize: 5000 })
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `cashier-audit-${new Date().toISOString().slice(0, 10)}.csv`;
          link.click();
          URL.revokeObjectURL(url);
          this.messageService.add({ severity: 'success', summary: 'تم التصدير', detail: 'تم تنزيل ملف CSV من الخادم.' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل تصدير سجل التدقيق.' })
      });
  }

  getActionLabel(type: string): string {
    return this.typeOptions.find((item) => item.value === type)?.label || type;
  }

  getActionIcon(type: string): string {
    const icons: Record<string, string> = {
      SALE_COMPLETED: 'pi-shopping-cart',
      INVOICE_CREATED: 'pi-receipt',
      INVOICE_CANCELLED: 'pi-times-circle',
      INVOICE_VOIDED: 'pi-ban',
      PAYMENT_CREATED: 'pi-credit-card',
      PAYMENT_CONFIRMED: 'pi-check-circle',
      PAYMENT_FAILED: 'pi-exclamation-circle',
      REFUND_CREATED: 'pi-undo',
      RECEIPT_REPRINTED: 'pi-print',
      SESSION_OPENED: 'pi-play',
      SESSION_CLOSED: 'pi-stop-circle',
      DRAWER_OPENED: 'pi-inbox',
      MANUAL_DISCOUNT: 'pi-percentage',
      PRICE_OVERRIDE: 'pi-shield',
      RESTRICTED_DRUG_DISPENSE: 'pi-lock',
      PRESCRIPTION_DISPENSE: 'pi-file-edit',
      INSURANCE_CLAIM_SUBMITTED: 'pi-send'
    };
    return icons[type] || 'pi-info-circle';
  }

  getSeverityLabel(severity: AuditSeverity): string {
    const labels: Record<AuditSeverity, string> = {
      success: 'Success',
      info: 'Info',
      warning: 'Warning',
      danger: 'Critical'
    };
    return labels[severity];
  }

  getSeverityTag(severity: AuditSeverity): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return severity;
  }

  trackByEvent(_: number, event: CashierAuditEvent): number | string {
    return event.id;
  }

  private loadEventTypes(): void {
    this.auditLogService.getTypes().subscribe({
      next: (rows) => {
        this.typeOptions = [
          { label: 'كل العمليات', value: 'all' },
          ...(rows || []).map((row: CashierAuditLogTypeDto) => ({
            label: row.label || row.code,
            value: row.code,
            severity: row.severity
          }))
        ];
      },
      error: () => {
        this.typeOptions = [{ label: 'كل العمليات', value: 'all' }];
      }
    });
  }

  private buildFilters(): CashierAuditLogFilters {
    const session = this.cashierService.getCurrentSessionSnapshot();
    return {
      page: 1,
      pageSize: 200,
      keyword: this.searchTerm.trim() || undefined,
      eventType: this.selectedType === 'all' ? undefined : this.selectedType,
      from: this.fromDate ? `${this.fromDate}T00:00:00` : undefined,
      to: this.toDate ? `${this.toDate}T23:59:59` : undefined,
      storeDetailsId: session?.storeDetailsId || undefined,
      sessionId: session?.id || undefined
    };
  }

  private mapEvent(dto: CashierAuditLogDto): CashierAuditEvent {
    const payload = this.parsePayload(dto.payloadJson);
    const eventType = dto.eventType || dto.action || 'UNKNOWN';
    return {
      id: dto.id,
      occurredAt: new Date(dto.eventDate ?? dto.occurredAt ?? dto.createdAt ?? Date.now()),
      userName: dto.userName ?? '',
      roleName: `${payload['roleName'] ?? payload['role'] ?? ''}`,
      stationName: `${payload['stationName'] ?? dto.sessionId ?? ''}`,
      actionType: eventType,
      severity: this.normalizeSeverity(dto.severity),
      referenceNo: dto.invoiceNo ?? dto.entityRef ?? undefined,
      amount: Number(payload['amount'] ?? payload['totalAmount'] ?? dto.amount ?? 0),
      message: dto.action ?? `${payload['message'] ?? eventType}`,
      ipAddress: `${payload['ipAddress'] ?? dto.ipAddress ?? ''}`,
      metadata: this.payloadToMetadata(payload, dto)
    };
  }

  private normalizeSeverity(value: unknown): AuditSeverity {
    const severity = `${value ?? 'info'}`.trim().toLowerCase();
    if (severity === 'critical' || severity === 'danger' || severity === 'high') return 'danger';
    if (severity === 'warning' || severity === 'warn') return 'warning';
    if (severity === 'success') return 'success';
    return 'info';
  }

  private parsePayload(payload: CashierAuditLogDto['payloadJson']): Record<string, unknown> {
    if (!payload) return {};
    if (typeof payload === 'object') return payload as Record<string, unknown>;
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return { payload };
    }
  }

  private payloadToMetadata(payload: Record<string, unknown>, dto: CashierAuditLogDto): AuditMetadataEntry[] {
    const core: Record<string, unknown> = {
      entityType: dto.entityType,
      entityRef: dto.entityRef,
      invoiceNo: dto.invoiceNo,
      sessionId: dto.sessionId,
      storeDetailsId: dto.storeDetailsId
    };
    return Object.entries({ ...core, ...payload })
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([label, value]) => ({ label, value: typeof value === 'object' ? JSON.stringify(value) : String(value) }));
  }
}
