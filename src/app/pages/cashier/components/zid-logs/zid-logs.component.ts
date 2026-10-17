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
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ZidApiService } from 'src/app/services/cashier/zid-api.service';
import { ZidSyncDirection, ZidSyncLog, ZidSyncStatus } from 'src/app/models/cashier/zid-integration.model';
import { getZidSyncStatusSeverity } from 'src/app/adapters/cashier/zid-order.adapter';
import { ZidShellComponent } from '../zid-shared/zid-shell.component';
import { ZidEmptyStateComponent } from '../zid-shared/zid-empty-state.component';
import { ZidSkeletonComponent } from '../zid-shared/zid-skeleton.component';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-zid-logs',
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
    TranslateModule,
    ZidShellComponent,
    ZidEmptyStateComponent,
    ZidSkeletonComponent
  ],
  providers: [MessageService],
  templateUrl: './zid-logs.component.html',
  styleUrls: ['../zid-integration.shared.scss']
})
export class ZidLogsComponent implements OnInit {
  loading = signal(false);
  error = signal('');
  logs = signal<ZidSyncLog[]>([]);
  totalRecords = signal(0);

  page = 1;
  pageSize = 50;
  eventType = '';

  constructor(
    private zidApi: ZidApiService,
    private messageService: MessageService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.zidApi.getLogs({
      page: this.page,
      pageSize: this.pageSize,
      eventType: this.eventType.trim() || null
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.logs.set(response.items);
          this.totalRecords.set(response.totalCount);
          this.loading.set(false);
        },
        error: error => {
          this.logs.set([]);
          this.totalRecords.set(0);
          this.error.set(this.readError(error, this.t('LOAD_LOGS_ERROR')));
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail: this.error(), life: 5500 });
        }
      });
  }

  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.loadLogs();
  }

  resetFilter(): void {
    this.eventType = '';
    this.page = 1;
    this.loadLogs();
  }

  syncStatusSeverity = getZidSyncStatusSeverity;

  syncStatusLabel(status: ZidSyncStatus): string {
    const keyMap: Record<ZidSyncStatus, string> = {
      [ZidSyncStatus.Pending]: 'SYNC_PENDING',
      [ZidSyncStatus.Synced]: 'SYNC_SYNCED',
      [ZidSyncStatus.Failed]: 'SYNC_FAILED',
      [ZidSyncStatus.Skipped]: 'SYNC_SKIPPED'
    };
    return this.t(keyMap[status] || 'UNKNOWN');
  }

  directionLabel(direction: ZidSyncDirection): string {
    return this.t(direction === ZidSyncDirection.ErpToZid ? 'DIRECTION_ERP_TO_ZID' : 'DIRECTION_ZID_TO_ERP');
  }

  private readError(error: any, fallback: string): string {
    return error?.error?.message ?? error?.error?.error ?? error?.message ?? fallback;
  }

  private t(key: string): string {
    return this.translate.instant(`CASHIER_ZID.${key}`);
  }
}
