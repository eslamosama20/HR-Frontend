import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CashierInvoiceActionRequest,
  CashierInvoiceDto,
  CashierInvoiceListFilters,
  CashierInvoicePaymentDto,
  CashierInvoiceRefundRequest,
  CashierInvoiceStatsDto,
  InvoiceActionReasonDto
} from 'src/app/models/cashier/cashier-invoice-control.model';

export interface CashierInvoiceListResult {
  items: CashierInvoiceDto[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CashierInvoiceControlService {
  private readonly cashierUrl = `${environment.server_urls[environment.active_server].baseApi}cashier`;

  constructor(private http: HttpClient) {}

  getInvoices(filters: CashierInvoiceListFilters = {}): Observable<CashierInvoiceListResult> {
    return this.http.get<any>(`${this.cashierUrl}/invoices`, { params: this.toParams(filters) }).pipe(
      map((response) => {
        const items = this.extractItems(response) as CashierInvoiceDto[];
        const total = Number(response?.totalCount ?? response?.total ?? response?.count ?? items.length) || items.length;
        return { items, total };
      })
    );
  }

  getStats(filters: CashierInvoiceListFilters = {}): Observable<CashierInvoiceStatsDto> {
    return this.http.get<CashierInvoiceStatsDto>(`${this.cashierUrl}/invoices/stats`, {
      params: this.toParams(filters, ['page', 'pageSize', 'status', 'paymentMethod', 'keyword'])
    });
  }

  getInvoice(id: number | string): Observable<CashierInvoiceDto> {
    return this.http.get<CashierInvoiceDto>(`${this.cashierUrl}/invoices/${id}`);
  }

  getPayment(invoiceId: number | string): Observable<CashierInvoicePaymentDto> {
    return this.http.get<CashierInvoicePaymentDto>(`${this.cashierUrl}/payment/${invoiceId}`);
  }

  getReceipt(id: number | string): Observable<Blob> {
    return this.http.get(`${this.cashierUrl}/invoices/${id}/receipt`, { responseType: 'blob' });
  }

  getActionReasons(action: 'cancel' | 'void' | 'refund'): Observable<InvoiceActionReasonDto[]> {
    const params = new HttpParams().set('action', action);
    return this.http.get<any>(`${this.cashierUrl}/invoice-action-reasons`, { params }).pipe(
      map((response) => this.extractItems(response) as InvoiceActionReasonDto[])
    );
  }

  cancelInvoice(id: number | string, payload: CashierInvoiceActionRequest): Observable<CashierInvoiceDto> {
    return this.http.post<CashierInvoiceDto>(`${this.cashierUrl}/invoices/${id}/cancel`, payload);
  }

  voidInvoice(id: number | string, payload: CashierInvoiceActionRequest): Observable<CashierInvoiceDto> {
    return this.http.post<CashierInvoiceDto>(`${this.cashierUrl}/invoices/${id}/void`, payload);
  }

  refundInvoice(id: number | string, payload: CashierInvoiceRefundRequest): Observable<CashierInvoiceDto> {
    return this.http.post<CashierInvoiceDto>(`${this.cashierUrl}/invoices/${id}/refund`, payload);
  }

  reprintInvoice(id: number | string): Observable<unknown> {
    return this.http.post(`${this.cashierUrl}/invoices/${id}/reprint`, {});
  }

  private toParams(filters: CashierInvoiceListFilters, omit: string[] = []): HttpParams {
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
