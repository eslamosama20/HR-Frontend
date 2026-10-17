import { Component, OnInit, inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNotification } from 'src/app/services/notification.service';
import { SystemNotificationsService } from 'src/app/services/system-notifications.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-system-notifications',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    TranslateModule,
    ButtonModule,
    TooltipModule,
    TableModule,
    TagModule,
    FormsModule,
    InputTextModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './system-notifications.component.html',
  styleUrls: ['./system-notifications.component.scss'],
})
export class SystemNotificationsComponent implements OnInit {
  @ViewChild('dt') table!: Table;
  
  private systemNotificationsService = inject(SystemNotificationsService);
  public translate = inject(TranslateService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  notifications: AppNotification[] = [];
  loading = false;
  searchValue = '';

  columns: Column[] = [
    { field: 'title', header: 'العنوان', filter: true, filterType: 'text' },
    { field: 'message', header: 'الرسالة', filter: true, filterType: 'text' },
    { field: 'date', header: 'التاريخ', filter: true, filterType: 'date' },
    { field: 'link', header: 'الرابط', filter: false },
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    if (this.loading) return; // منع الطلبات المتعددة
    
    console.log('[SystemNotifications Component] Loading notifications...');
    this.loading = true;
    
    this.systemNotificationsService.getAllIncludingIgnored().subscribe({
      next: (notifications) => {
        console.log('[SystemNotifications Component] Received notifications:', notifications);
        this.notifications = notifications || [];
        this.loading = false;
        console.log('[SystemNotifications Component] Loading complete. Count:', this.notifications.length);
        
        // Force change detection
        this.cdr.detectChanges();
        
        // Force table refresh
        if (this.table) {
          setTimeout(() => {
            this.table.reset();
            this.cdr.detectChanges();
          }, 0);
        }
      },
      error: (err) => {
        console.error('[System Notifications] Failed to load notifications.', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: err.message?.includes('timeout') 
            ? 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.' 
            : 'فشل تحميل الإشعارات',
        });
        this.notifications = [];
        this.loading = false;
      },
    });
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(table: Table, event: any) {
    table.filterGlobal(event.target.value, 'contains');
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      success: 'نجاح',
      error: 'خطأ',
      warning: 'تحذير',
      info: 'معلومات',
    };
    return labels[type] || type;
  }

  getTypeSeverity(type: string): string {
    const severities: { [key: string]: string } = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'info',
    };
    return severities[type] || 'info';
  }
}
