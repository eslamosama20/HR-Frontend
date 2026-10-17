import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AppNotification, NotificationType } from './notification.service';

@Injectable({ providedIn: 'root' })
export class SystemNotificationsService {
  constructor(private http: HttpClient) {}

  /**
   * يحمل جميع الإشعارات بما فيها المُتجاهلة
   */
  getAllIncludingIgnored(): Observable<AppNotification[]> {
    const baseApi = this.resolveBaseApi();
    const url = `${baseApi}UserNotifications/GetAllIncludingIgnored`;
    
    console.log('[SystemNotifications] Loading from:', url);
    
    return this.http.get<any[]>(url).pipe(
      map((payload) => {
        console.log('[SystemNotifications] Response:', payload);
        
        if (!payload || !Array.isArray(payload)) {
          console.warn('[SystemNotifications] Invalid payload:', payload);
          return [];
        }
        
        const mapped = payload
          .filter((item) => item && typeof item === 'object') // فلترة العناصر الفارغة
          .map((item) => {
            let date: Date;
            try {
              date = item.createdAt ? new Date(item.createdAt) : new Date();
              if (isNaN(date.getTime())) {
                date = new Date();
              }
            } catch {
              date = new Date();
            }
            
            return {
              id: item.id || `${Date.now()}-${Math.random()}`,
              title: item.title || '',
              content: item.content || '',
              message: item.content || item.title || 'Notification',
              link: item.link || undefined,
              date: date,
              read: !!item.isRead,
              type: 'info' as NotificationType,
              source: 'rest' as const,
            };
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime()); // ترتيب حسب التاريخ
        
        console.log('[SystemNotifications] Mapped notifications:', mapped);
        return mapped;
      })
    );
  }

  private resolveBaseApi(): string {
    const baseApi =
      environment.server_urls?.[environment.active_server]?.['baseApi'];
    if (!baseApi) {
      throw new Error('Missing baseApi in environment configuration');
    }
    return baseApi;
  }
}

