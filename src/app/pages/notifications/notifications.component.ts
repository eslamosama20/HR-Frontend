import { Component, OnInit, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AppNotification,
  NotificationService,
} from 'src/app/services/notification.service';
import { environment } from 'src/environments/environment';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  notifications$!: Observable<AppNotification[]>;
  unreadCount$ = this.notificationService.unreadCount$;

  ngOnInit(): void {
    // خلي السيرفيس يعتمد على wsUrl من environment حسب active_server
    this.notificationService.connect();
    this.notifications$ = this.notificationService.notifications$;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAll(): void {
    this.notificationService.clearNotifications();
  }

  ignoreAll(): void {
    this.notificationService.ignoreAll();
  }

  trackById(_i: number, n: AppNotification): string | number {
    return n.id;
  }

  onItemClick(n: AppNotification, _ev?: MouseEvent): void {
    this.notificationService.markAsRead(n.id, n.backendId);
    if (n.link) window.open(n.link, '_blank', 'noopener');
  }

  onIgnore(n: AppNotification, ev: MouseEvent): void {
    ev.stopPropagation();
    this.notificationService.ignoreNotification(n);
  }

  onItemKeydown(n: AppNotification, ev: KeyboardEvent | Event): void {
    const keyEvent = ev as KeyboardEvent;
    const key = keyEvent.key.toLowerCase();
    if (key === 'enter' || key === ' ') {
      keyEvent.preventDefault();
      this.onItemClick(n);
    }
  }
}
