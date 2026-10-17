import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';
import { AuthService } from '../modules/auth';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number | string;
  backendId?: string;
  type: NotificationType;
  title?: string;
  content?: string;
  message: string;
  link?: string;
  date: Date;
  read: boolean;
  source?: 'ws' | 'rest';
}

type ConnectOptions = {
  token?: string;
  userId?: string | number;
};

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private notifications: AppNotification[] = [];
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private incomingSubject = new Subject<AppNotification>();
  readonly incoming$ = this.incomingSubject.asObservable();

  private socket$?: WebSocketSubject<any>;
  private wsUrl?: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelayMs = 15000;
  private heartbeatInterval?: any;
  private pendingUserIdTimer?: any;
  private pendingUserIdAttempts = 0;
  private readonly maxUserIdAttempts = 10;
  private initialLoadUserId?: string;
  private initialLoadInFlight = false;

  constructor(private http: HttpClient, private authService: AuthService) {}

  connect(url?: string, opts?: ConnectOptions) {
    const envWs =
      environment.server_urls?.[environment.active_server]?.['wsUrl'];
    const base = url ?? envWs ?? this.wsUrl;

    if (!base || !base.startsWith('ws')) {
      console.error('[WS] Invalid or missing ws url. Aborting connect.', {
        base,
        envWs,
        activeServer: environment.active_server,
      });
      return;
    }

    const userId = this.resolveUserId(opts);
    if (!userId) {
      console.warn('[WS] No userId resolved yet. Retrying shortly.');
      this.scheduleUserIdRetry(url, opts);
      return;
    }

    this.clearUserIdRetry();
    this.loadInitialNotifications(String(userId));

    this.wsUrl = this.appendQuery(base, { userId: String(userId) });

    console.info('[WS] Connecting...', {
      activeServer: environment.active_server,
      base,
      wsUrl: this.wsUrl,
      userId,
    });

    if (this.socket$) return;
    this.openSocket();
  }

  disconnect() {
    this.stopHeartbeat();
    this.clearUserIdRetry();
    this.socket$?.complete();
    this.socket$ = undefined;
  }

  addNotification(notification: AppNotification, emitIncoming = true) {
    this.upsertNotifications([notification], emitIncoming);
  }

  markAllAsRead() {
    const idsToSync = new Set<string>();

    this.notifications = this.notifications.map((n) => {
      if (!n.read && n.backendId) {
        idsToSync.add(n.backendId);
      }
      return { ...n, read: true };
    });

    this.emit();

    idsToSync.forEach((backendId) => this.syncMarkAsRead(backendId));
  }

  markAsRead(id: number | string, backendId?: string) {
    this.updateNotificationState(id, { read: true });
    if (backendId) {
      this.syncMarkAsRead(backendId);
    }
  }

  clearNotifications() {
    this.notifications = [];
    this.emit();
  }

  ignoreNotification(n: AppNotification) {
    this.notifications = this.notifications.filter((item) => item.id !== n.id);
    this.emit();
    if (n.backendId) {
      this.syncIgnore(n.backendId);
    }
  }

  ignoreAll() {
    this.notifications = [];
    this.emit();
    this.syncIgnoreAll();
  }

  // ====== WebSocket ======
  private openSocket() {
    if (!this.wsUrl) return;

    this.socket$ = webSocket(this.wsUrl);

    this.socket$.subscribe({
      next: (msg) => {
        if (this.reconnectAttempts > 0) this.reconnectAttempts = 0;
        this.startHeartbeat();

        console.log('[WS] message (raw):', msg);

        const n = this.normalizeIncoming(msg);
        n.source = 'ws';

        console.log('[WS] message (normalized):', n);
        this.addNotification(n);
      },
      error: (err) => {
        console.error('[WS] error:', err);
        this.scheduleReconnect();
      },
      complete: () => {
        console.warn('[WS] completed by server. Scheduling reconnect...');
        this.scheduleReconnect();
      },
    });
  }

  private scheduleReconnect() {
    this.stopHeartbeat();
    this.socket$ = undefined;
    this.reconnectAttempts++;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelayMs
    );

    console.warn(
      `[WS] Reconnecting in ${delay} ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (!this.wsUrl) {
        console.error('[WS] No wsUrl found on reconnect. Aborting.');
        return;
      }
      this.openSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      try {
        this.socket$?.next({ type: 'ping', t: Date.now() });
      } catch (e) {
        console.warn('[WS] heartbeat failed, scheduling reconnect...', e);
        this.scheduleReconnect();
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private scheduleUserIdRetry(url?: string, opts?: ConnectOptions) {
    if (this.pendingUserIdAttempts >= this.maxUserIdAttempts) {
      return;
    }
    if (this.pendingUserIdTimer) {
      return;
    }
    const delay = Math.min(1000 * Math.pow(1.5, this.pendingUserIdAttempts), 10000);
    this.pendingUserIdAttempts++;
    this.pendingUserIdTimer = setTimeout(() => {
      this.pendingUserIdTimer = undefined;
      this.connect(url, opts);
    }, delay);
  }

  private clearUserIdRetry() {
    if (this.pendingUserIdTimer) {
      clearTimeout(this.pendingUserIdTimer);
      this.pendingUserIdTimer = undefined;
    }
    this.pendingUserIdAttempts = 0;
  }

  private upsertNotifications(list: AppNotification[], emitIncoming = true) {
    if (!list.length) {
      return;
    }
    const registry = new Map<string | number, AppNotification>();
    for (const existing of this.notifications) {
      registry.set(existing.id, existing);
    }
    for (const item of list) {
      const previous = registry.get(item.id);
      const merged: AppNotification = {
        ...previous,
        ...item,
        date: item.date instanceof Date ? item.date : new Date(item.date),
      } as AppNotification;
      registry.set(item.id, merged);
      if (emitIncoming && !previous) {
        this.incomingSubject.next(merged);
      }
    }
    this.notifications = Array.from(registry.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    this.emit();
  }

  private loadInitialNotifications(userId: string) {
    if (!userId) {
      return;
    }
    if (this.initialLoadInFlight) {
      return;
    }
    if (this.initialLoadUserId === userId) {
      return;
    }
    let baseApi: string;
    try {
      baseApi = this.resolveBaseApi();
    } catch (err) {
      console.error('[Notifications] Missing baseApi for initial load.', err);
      return;
    }
    this.initialLoadInFlight = true;
    this.http
      .get<any[]>(`${baseApi}UserNotifications/GetAll`)
      .subscribe({
        next: (payload) => {
          const mapped = this.mapStoredNotifications(payload);
          if (mapped.length) {
            this.upsertNotifications(mapped, false);
          }
          this.initialLoadUserId = userId;
        },
        error: (err) => {
          console.error('[Notifications] Failed to load stored notifications.', err);
          this.initialLoadInFlight = false;
        },
        complete: () => {
          this.initialLoadInFlight = false;
        },
      });
  }

  private mapStoredNotifications(payload: any): AppNotification[] {
    if (!Array.isArray(payload)) {
      return [];
    }
    const list: AppNotification[] = [];
    for (const item of payload) {
      const normalized = this.mapStoredNotification(item);
      if (normalized) {
        list.push(normalized);
      }
    }
    return list;
  }

  private mapStoredNotification(input: any): AppNotification | null {
    if (!input || typeof input !== 'object') {
      return null;
    }
    const ignored = this.pickFirst<boolean>(input, ['isIgnored', 'IsIgnored']);
    if (ignored) {
      return null;
    }
    const id =
      this.pickFirst<string | number>(input, ['id', 'Id', 'notificationId', 'NotificationId']) ??
      Date.now();
    const backendId = this.pickFirst<string>(input, [
      'userNotificationId',
      'UserNotificationId',
      'userNotificationID',
    ]);
    const typeRaw = this.pickFirst<any>(input, ['notificationType', 'NotificationType']);
    const type = this.mapNotificationType(typeRaw);
    const title =
      this.pickFirst<string>(input, ['title', 'Title', 'subject', 'Subject']) ?? undefined;
    const content =
      this.pickFirst<string>(input, ['content', 'Content', 'body', 'Body', 'message', 'Message']) ??
      undefined;
    const message = (content ?? title ?? 'Notification').toString();
    const link = this.pickFirst<string>(input, ['link', 'Link', 'url', 'Url']) ?? undefined;
    const createdRaw = this.pickFirst<any>(input, ['createdAt', 'CreatedAt', 'timestamp', 'Timestamp']);
    const date = createdRaw ? new Date(createdRaw) : new Date();
    const read = !!this.pickFirst<boolean>(input, ['isRead', 'IsRead']);

    return {
      id: typeof id === 'string' || typeof id === 'number' ? id : Date.now(),
      backendId,
      type,
      title,
      content,
      message,
      link,
      date,
      read,
      source: 'rest',
    };
  }

  // ====== Normalization ======
  private normalizeIncoming(input: any): AppNotification {
    const msg = this.unwrapMessage(input);

    const id =
      this.pickFirst<string | number>(msg, [
        'id',
        'notificationId',
        'Id',
        'NotificationId',
      ]) ?? Date.now();

    const typeRaw = this.pickFirst<any>(msg, [
      'notificationType',
      'type',
      'Type',
      'level',
      'Level',
      'severity',
      'Severity',
    ]);
    const type = this.mapNotificationType(typeRaw);

    const title =
      this.pickFirst<string>(msg, [
        'title',
        'Title',
        'subject',
        'Subject',
        'header',
        'Header',
      ]) ?? undefined;

    const content =
      this.pickFirst<string>(msg, [
        'content',
        'Content',
        'body',
        'Body',
        'message',
        'Message',
        'text',
        'Text',
      ]) ?? undefined;

    const message = (content ?? title ?? 'Notification').toString();

    const link =
      this.pickFirst<string>(msg, [
        'link',
        'Link',
        'url',
        'Url',
        'href',
        'Href',
      ]) ?? undefined;

    const dateRaw =
      this.pickFirst<any>(msg, [
        'createdAt',
        'CreatedAt',
        'created_on',
        'timestamp',
        'time',
        'date',
        'Date',
      ]) ?? undefined;

    const date = dateRaw ? new Date(dateRaw) : new Date();
    const backendId = this.pickFirst<string>(msg, [
      'userNotificationId',
      'UserNotificationId',
      'userNotificationID',
    ]);

    return {
      id: typeof id === 'string' || typeof id === 'number' ? id : Date.now(),
      backendId,
      type,
      title,
      content,
      message,
      link,
      date,
      read: false,
    };
  }

  private updateNotificationState(id: number | string, patch: Partial<AppNotification>) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, ...patch } : n
    );
    this.emit();
  }

  private syncMarkAsRead(userNotificationId: string) {
    this.http
      .put<void>(
        `${this.resolveBaseApi()}UserNotifications/${userNotificationId}/read`,
        {}
      )
      .subscribe({
        error: (err) =>
          console.error('[Notifications] Failed to mark as read on server.', err),
      });
  }

  private syncIgnore(userNotificationId: string) {
    this.http
      .put<void>(
        `${this.resolveBaseApi()}UserNotifications/${userNotificationId}/ignore`,
        {}
      )
      .subscribe({
        error: (err) =>
          console.error('[Notifications] Failed to ignore notification on server.', err),
      });
  }

  private resolveBaseApi(): string {
    const baseApi =
      environment.server_urls?.[environment.active_server]?.['baseApi'];
    if (!baseApi) {
      throw new Error('Missing baseApi in environment configuration');
    }
    return baseApi;
  }

  private syncIgnoreAll() {
    this.http
      .put<void>(`${this.resolveBaseApi()}UserNotifications/ignore-all`, {})
      .subscribe({
        error: (err) =>
          console.error('[Notifications] Failed to ignore all notifications on server.', err),
      });
  }

  /** يفك أي غلاف شائع للرسالة: data/payload/notification/message… أو JSON كسلسلة */
  private unwrapMessage(input: any): any {
    // لو السيرفر أرسل string JSON
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return this.unwrapMessage(parsed);
      } catch {
        // مجرد نص خام
        return { message: input };
      }
    }

    if (input && typeof input === 'object') {
      // أظرف شائعة
      const wrappers = [
        'data',
        'payload',
        'notification',
        'message',
        'Message',
      ];
      for (const w of wrappers) {
        if (input[w] && typeof input[w] === 'object') {
          return this.unwrapMessage(input[w]);
        }
      }
      return input;
    }

    // أي نوع آخر
    return { message: String(input ?? 'Notification') };
  }

  private pickFirst<T = any>(obj: any, keys: string[]): T | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
    }
    return undefined;
  }

  private mapNotificationType(input: any): NotificationType {
    if (typeof input === 'string') {
      const s = input.toLowerCase();
      if (s === 'success' || s === 'error' || s === 'warning' || s === 'info') {
        return s as NotificationType;
      }
      if (s === 'warn') return 'warning';
      if (s === 'danger' || s === 'fail' || s === 'failed') return 'error';
    }
    if (typeof input === 'number') {
      // عدّل الماب لو الباك مختلف
      switch (input) {
        case 2:
          return 'success';
        case 3:
          return 'warning';
        case 4:
          return 'error';
        case 1:
        default:
          return 'info';
      }
    }
    return 'info';
  }

  private emit() {
    this.notificationsSubject.next(this.notifications);
    this.unreadCountSubject.next(
      this.notifications.filter((n) => !n.read).length
    );
  }

  // ====== userId from JWT / storage ======
  private resolveUserId(opts?: ConnectOptions): string | number | null {
    if (opts?.userId) return String(opts.userId);

    if (opts?.token) {
      const fromOpts = this.extractUserIdFromToken(opts.token);
      if (fromOpts) return fromOpts;
    }

    const token = this.getAuthTokenFromStorage();
    if (token) {
      const fromStorage = this.extractUserIdFromToken(token);
      if (fromStorage) return fromStorage;
    }

    const lsUserId = localStorage.getItem('userId');
    if (lsUserId && lsUserId.trim()) return lsUserId.trim();

    return null;
  }

  private getAuthTokenFromStorage(): string | null {
    const candidates = [
      'authToken',
      'access_token',
      'token',
      'id_token',
      environment.USERDATA_KEY,
    ];

    for (const k of candidates) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.token) return parsed.token;
      } catch {
        return raw;
      }
    }
    return null;
  }

  private decodeJwt<T = any>(token: string): T | null {
    const obj = this.authService.decodeJwtPayload(token.split('.')[1]);
    if (obj === null) {
      return null;
    }
    console.debug('[WS] Decoded JWT claims:', obj);
    return obj as T;
  }

  private extractUserIdFromToken(token: string): string | null {
    const claims = this.decodeJwt<any>(token);
    if (!claims) return null;

    const directKeys = ['userId', 'uid', 'sub', 'nameid', 'name', 'sid'];
    for (const key of directKeys) {
      const val = claims[key];
      if (this.isValidGuidLike(val) || this.isNonEmpty(val)) return String(val);
    }

    const nsKeys = [
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    ];
    for (const key of nsKeys) {
      const val = claims[key];
      if (this.isValidGuidLike(val) || this.isNonEmpty(val)) return String(val);
    }

    return null;
  }

  private isNonEmpty(val: any): boolean {
    return typeof val === 'string' && val.trim().length > 0;
  }

  private isValidGuidLike(val: any): boolean {
    if (!this.isNonEmpty(val)) return false;
    const s = String(val).trim();
    const guidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return guidRegex.test(s);
  }

  private appendQuery(baseUrl: string, params: Record<string, string>): string {
    const [prefix, existing = ''] = baseUrl.split('?');
    const search = new URLSearchParams(existing);
    Object.entries(params).forEach(([k, v]) => search.set(k, v));
    const qs = search.toString();
    return qs ? `${prefix}?${qs}` : prefix;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
