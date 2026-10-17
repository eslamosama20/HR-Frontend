import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  NotificationService,
  AppNotification,
} from 'src/app/services/notification.service';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
interface ToastVm extends AppNotification {
  toastId: number;
  timeoutMs: number;
}

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  private notifications = inject(NotificationService);
  private sub?: Subscription;

  toasts: ToastVm[] = [];

  ngOnInit(): void {
    // إشعارات جديدة فقط
    this.sub = this.notifications.incoming$.subscribe((n: AppNotification) => {
      const toast: ToastVm = {
        ...n,
        toastId: Date.now() + Math.floor(Math.random() * 1000),
        timeoutMs: 5000,
      };
      this.toasts = [toast, ...this.toasts];

      setTimeout(() => this.dismiss(toast.toastId), toast.timeoutMs);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.toastId !== id);
  }

  onClick(t: ToastVm) {
    if (t.link) window.open(t.link, '_blank', 'noopener');
    this.dismiss(t.toastId);
  }

  iconName(type: ToastVm['type']): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'notifications';
    }
  }

  classByType(type: ToastVm['type']): string {
    switch (type) {
      case 'success':
        return 'toast toast--success';
      case 'error':
        return 'toast toast--error';
      case 'warning':
        return 'toast toast--warning';
      default:
        return 'toast toast--info';
    }
  }

  trackById = (_: number, t: ToastVm) => t.toastId;
}
