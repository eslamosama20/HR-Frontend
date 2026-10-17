import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NotificationMessage {
  title: string;
  message: string;
  type: string;
  priority: string;
  timestamp: Date;
}

export interface BookingNotification {
  bookingReference: string;
  guestName: string;
  hotelName: string;
  amount: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private notificationsSubject = new BehaviorSubject<NotificationMessage[]>([]);
  private newBookingSubject = new BehaviorSubject<BookingNotification | null>(null);
  private connectionStateSubject = new BehaviorSubject<boolean>(false);

  public notifications$ = this.notificationsSubject.asObservable();
  public newBooking$ = this.newBookingSubject.asObservable();
  public connectionState$ = this.connectionStateSubject.asObservable();

  private apiUrl = 'https://localhost:44360'; // Update with your backend URL

  constructor() {
    this.startConnection();
    this.registerHandlers();
  }

  private startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrl}/notificationHub`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Connected');
        this.connectionStateSubject.next(true);
      })
      .catch(err => {
        console.error('SignalR Connection Error: ', err);
        this.connectionStateSubject.next(false);
        // Retry connection after 5 seconds
        setTimeout(() => this.startConnection(), 5000);
      });

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR Reconnecting...');
      this.connectionStateSubject.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR Reconnected');
      this.connectionStateSubject.next(true);
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR Disconnected');
      this.connectionStateSubject.next(false);
      // Retry connection after 5 seconds
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  private registerHandlers() {
    if (!this.hubConnection) return;

    // Handle general notifications
    this.hubConnection.on('ReceiveNotification', (data: NotificationMessage) => {
      console.log('Notification received:', data);
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([data, ...currentNotifications]);
      this.showBrowserNotification(data.title, data.message);
    });

    // Handle new booking notifications
    this.hubConnection.on('NewBooking', (data: BookingNotification) => {
      console.log('New booking received:', data);
      this.newBookingSubject.next(data);
      this.showBrowserNotification(
        'حجز جديد!',
        `${data.guestName} - ${data.hotelName} - ${data.amount} ر.س`
      );
      
      // Add to general notifications
      const notification: NotificationMessage = {
        title: `حجز جديد - ${data.bookingReference}`,
        message: `${data.guestName} حجز في ${data.hotelName}`,
        type: 'NewBooking',
        priority: 'High',
        timestamp: data.timestamp
      };
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });

    // Handle booking cancellation
    this.hubConnection.on('BookingCancelled', (data: any) => {
      console.log('Booking cancelled:', data);
      const notification: NotificationMessage = {
        title: `تم إلغاء الحجز - ${data.bookingReference}`,
        message: `السبب: ${data.reason}`,
        type: 'Cancellation',
        priority: 'Medium',
        timestamp: data.timestamp
      };
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });

    // Handle low inventory alerts
    this.hubConnection.on('LowInventory', (data: any) => {
      console.log('Low inventory alert:', data);
      const notification: NotificationMessage = {
        title: 'تنبيه: مخزون منخفض',
        message: `${data.roomTypeName} - متبقي ${data.remainingQuantity} غرفة فقط`,
        type: 'LowInventory',
        priority: 'High',
        timestamp: data.timestamp
      };
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });
  }

  private showBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/assets/logo.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/assets/logo.png' });
        }
      });
    }
  }

  public clearNotifications() {
    this.notificationsSubject.next([]);
  }

  public markAsRead(notification: NotificationMessage) {
    const notifications = this.notificationsSubject.value.filter(n => n !== notification);
    this.notificationsSubject.next(notifications);
  }

  public disconnect() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
