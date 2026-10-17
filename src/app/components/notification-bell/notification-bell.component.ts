import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalRService, NotificationMessage } from '../../services/signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Bell Icon -->
      <button
        (click)="toggleDropdown()"
        class="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        [class.animate-bounce]="hasNewNotifications">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        <!-- Badge -->
        <span
          *ngIf="unreadCount > 0"
          class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>

        <!-- Connection Status -->
        <span
          class="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full"
          [class.bg-green-500]="isConnected"
          [class.bg-red-500]="!isConnected">
        </span>
      </button>

      <!-- Dropdown -->
      <div
        *ngIf="showDropdown"
        class="absolute right-0 z-50 w-96 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[500px] overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-800">الإشعارات</h3>
          <button
            (click)="clearAll()"
            class="text-sm text-blue-600 hover:text-blue-800"
            *ngIf="notifications.length > 0">
            مسح الكل
          </button>
        </div>

        <!-- Notifications List -->
        <div class="overflow-y-auto max-h-[400px]">
          <div *ngIf="notifications.length === 0" class="p-8 text-center text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p class="text-sm">لا توجد إشعارات</p>
          </div>

          <div
            *ngFor="let notification of notifications; let i = index"
            class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            (click)="markAsRead(notification)">
            <div class="flex items-start">
              <!-- Icon -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                [ngClass]="{
                  'bg-blue-100 text-blue-600': notification.type === 'NewBooking',
                  'bg-yellow-100 text-yellow-600': notification.type === 'LowInventory',
                  'bg-red-100 text-red-600': notification.type === 'Cancellation',
                  'bg-gray-100 text-gray-600': notification.type === 'Info'
                }">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    *ngIf="notification.type === 'NewBooking'"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path
                    *ngIf="notification.type === 'LowInventory'"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  <path
                    *ngIf="notification.type === 'Cancellation'"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <!-- Content -->
              <div class="mr-3 flex-1">
                <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                <p class="text-sm text-gray-600 mt-1">{{ notification.message }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ formatTime(notification.timestamp) }}</p>
              </div>

              <!-- Priority Badge -->
              <span
                *ngIf="notification.priority === 'High'"
                class="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                عاجل
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div
      *ngIf="showDropdown"
      class="fixed inset-0 z-40"
      (click)="toggleDropdown()">
    </div>
  `,
  styles: [`
    .animate-bounce {
      animation: bounce 1s infinite;
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(-25%);
        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
      }
      50% {
        transform: translateY(0);
        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: NotificationMessage[] = [];
  unreadCount = 0;
  showDropdown = false;
  isConnected = false;
  hasNewNotifications = false;
  private subscriptions: Subscription[] = [];

  constructor(private signalRService: SignalRService) {}

  ngOnInit() {
    // Subscribe to notifications
    this.subscriptions.push(
      this.signalRService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.unreadCount = notifications.length;

        // Trigger bounce animation for new notifications
        if (notifications.length > this.notifications.length) {
          this.hasNewNotifications = true;
          setTimeout(() => this.hasNewNotifications = false, 3000);
        }
      })
    );

    // Subscribe to connection state
    this.subscriptions.push(
      this.signalRService.connectionState$.subscribe(state => {
        this.isConnected = state;
      })
    );

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    this.hasNewNotifications = false;
  }

  markAsRead(notification: NotificationMessage) {
    this.signalRService.markAsRead(notification);
  }

  clearAll() {
    this.signalRService.clearNotifications();
    this.showDropdown = false;
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  }
}
