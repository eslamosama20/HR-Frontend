import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CashierAuditLogDto,
  CashierAuditLogFilters,
  CashierAuditLogTypeDto,
  CashierAuditStatsDto
} from 'src/app/models/cashier/cashier-audit-log.model';

export interface CashierAuditLogListResult {
  items: CashierAuditLogDto[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CashierAuditLogService {
  private readonly cashierUrl = `${environment.server_urls[environment.active_server].baseApi}cashier`;

  constructor(private http: HttpClient) {}

  getLogs(filters: CashierAuditLogFilters = {}): Observable<CashierAuditLogListResult> {
    return this.http.get<any>(`${this.cashierUrl}/audit-logs`, { params: this.toParams(filters) }).pipe(
      map((response) => {
        const items = this.extractItems(response) as CashierAuditLogDto[];
        const total = Number(response?.totalCount ?? response?.total ?? response?.count ?? items.length) || items.length;
        return { items, total };
      })
    );
  }

  getStats(filters: CashierAuditLogFilters = {}): Observable<CashierAuditStatsDto> {
    return this.http.get<CashierAuditStatsDto>(`${this.cashierUrl}/audit-logs/stats`, {
      params: this.toParams(filters, ['page', 'pageSize', 'eventType', 'invoiceNo', 'keyword', 'userId'])
    });
  }

  getLog(id: number | string): Observable<CashierAuditLogDto> {
    return this.http.get<CashierAuditLogDto>(`${this.cashierUrl}/audit-logs/${id}`);
  }

  getTypes(): Observable<CashierAuditLogTypeDto[]> {
    return this.http.get<any>(`${this.cashierUrl}/audit-log-types`).pipe(
      map((response) => this.extractItems(response) as CashierAuditLogTypeDto[])
    );
  }

  exportCsv(filters: CashierAuditLogFilters = {}): Observable<Blob> {
    return this.http.post(`${this.cashierUrl}/audit-logs/export`, filters, { responseType: 'blob' });
  }

  private toParams(filters: CashierAuditLogFilters, omit: string[] = []): HttpParams {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (omit.includes(key) || value === undefined || value === null || value === '') {
        return;
      }
      params = params.set(key, String(value));
    });
    return params;
  }

  private extractItems(source: any): any[] {
    if (Array.isArray(source)) return source;
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source?.result?.items)) return source.result.items;
    return [];
  }
}
