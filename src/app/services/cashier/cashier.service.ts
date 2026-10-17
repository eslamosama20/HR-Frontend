import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CashierSession, CashierSessionSummary } from 'src/app/models/cashier/cashier-session.model';
import { POSInvoice, PaymentRequest, PaymentResponse } from 'src/app/models/cashier/pos-invoice.model';
import { CashierProduct, ProductSearchFilter, QuickProduct } from 'src/app/models/cashier/cashier-product.model';
import { CashierHeldOrderRequest } from 'src/app/models/cashier/held-order.model';

@Injectable({
  providedIn: 'root'
})
export class CashierService {
  private baseUrl = environment.server_urls[environment.active_server];
  private cashierUrl = `${this.baseUrl.baseApi}cashier`;
  
  // Current active session
  private currentSessionSubject = new BehaviorSubject<CashierSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  private sessionExpiredSubject = new BehaviorSubject<CashierSession | null>(null);
  public sessionExpired$ = this.sessionExpiredSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCurrentSession();
    this.currentSession$.subscribe(session => {
      if (session) {
        this.checkSessionExpiration();
      }
    });
    setInterval(() => this.checkSessionExpiration(), 10000);
  }

  private checkSessionExpiration(): void {
    const session = this.currentSessionSubject.value;
    if (!session || !session.id || !session.openingDate) {
      if (this.sessionExpiredSubject.value !== null) {
        this.sessionExpiredSubject.next(null);
      }
      return;
    }
    
    const durationStr = localStorage.getItem('session_duration_' + session.id);
    if (!durationStr) {
      return;
    }
    
    const durationHours = parseFloat(durationStr);
    if (isNaN(durationHours)) return;
    
    const openTime = new Date(session.openingDate).getTime();
    const expireTime = openTime + (durationHours * 60 * 60 * 1000);
    const now = new Date().getTime();
    
    if (now >= expireTime) {
      if (this.sessionExpiredSubject.value?.id !== session.id) {
        this.sessionExpiredSubject.next(session);
      }
    } else {
      if (this.sessionExpiredSubject.value !== null) {
        this.sessionExpiredSubject.next(null);
      }
    }
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ==================== Session Management ====================
  
  /**
   * Load current active session
   */
  public loadCurrentSession(): void {
    this.getCurrentSession().subscribe({
      next: (session) => {
        this.currentSessionSubject.next(session);
        this.checkSessionExpiration();
      },
      error: () => this.currentSessionSubject.next(null)
    });
  }

  getCurrentSessionSnapshot(): CashierSession | null {
    return this.currentSessionSubject.value;
  }

  /**
   * Get current active session
   */
  getCurrentSession(): Observable<CashierSession> {
    return this.http.get<CashierSession>(`${this.cashierUrl}/session/current`);
  }

  /**
   * Open new cashier session
   */
  openSession(openingBalance: number, treasuryId?: number, storeDetailsId?: string, terminalId?: string, durationHours?: number, sessionNumber?: string, stockAlertLimit?: number): Observable<CashierSession> {
    return this.http.post<CashierSession>(`${this.cashierUrl}/session/open`, {
      openingBalance,
      treasuryId,
      storeDetailsId,
      terminalId,
      sessionNumber,
      stockAlertLimit
    }).pipe(
      map(session => {
        if (session && session.id && durationHours) {
          localStorage.setItem('session_duration_' + session.id, durationHours.toString());
        }
        this.currentSessionSubject.next(session);
        this.checkSessionExpiration();
        return session;
      })
    );
  }

  /**
   * Close current session
   */
  closeSession(
    sessionId: number,
    actualBalance: number,
    notes?: string,
    supervisorApproval?: { supervisorId: string; approvalPasscode: string }
  ): Observable<CashierSession> {
    return this.http.post<CashierSession>(`${this.cashierUrl}/session/${sessionId}/close`, {
      actualBalance,
      notes,
      supervisorApproval
    }).pipe(
      map(session => {
        localStorage.removeItem('session_duration_' + sessionId);
        this.currentSessionSubject.next(null);
        this.sessionExpiredSubject.next(null);
        return session;
      })
    );
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: number): Observable<CashierSessionSummary> {
    return this.http.get<CashierSessionSummary>(`${this.cashierUrl}/session/${sessionId}/summary`);
  }

  /**
   * Get detailed session report
   */
  getSessionReport(sessionId: number): Observable<any> {
    return this.http.get<any>(`${this.cashierUrl}/session/${sessionId}/report`);
  }

  /**
   * Get all sessions (with pagination)
   */
  getSessions(pageNumber: number = 1, pageSize: number = 20): Observable<{ items: CashierSession[], total: number }> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    return this.http.get<any>(`${this.cashierUrl}/sessions`, { params }).pipe(
      map(response => ({
        items: response.items || response.data || [],
        total: response.total || response.totalCount || 0
      }))
    );
  }

  // ==================== Products ====================

  /**
   * Search products for POS
   */
  searchProducts(filter: ProductSearchFilter): Observable<CashierProduct[]> {
    let params = new HttpParams();
    
    if (filter.searchTerm) params = params.set('search', filter.searchTerm);
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter.barcode) params = params.set('barcode', filter.barcode);
    if (filter.inStock !== undefined) params = params.set('inStock', filter.inStock.toString());
    if (filter.storeDetailsId) params = params.set('storeDetailsId', filter.storeDetailsId);
    if (filter.pageNumber) params = params.set('pageNumber', filter.pageNumber.toString());
    if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());

    if (filter.cashierSessionId) {
      return this.http.get<CashierProduct[]>(
        `${this.cashierUrl}/products/by-session/${filter.cashierSessionId}`,
        { params }
      );
    }

    return this.http.get<CashierProduct[]>(`${this.cashierUrl}/products`, { params });
  }

  /**
   * Get product by barcode
   */
  getProductByBarcode(barcode: string, cashierSessionId?: number, storeDetailsId?: string): Observable<CashierProduct> {
    let params = new HttpParams();
    if (cashierSessionId) params = params.set('cashierSessionId', cashierSessionId.toString());
    if (storeDetailsId) params = params.set('storeDetailsId', storeDetailsId);
    return this.http.get<CashierProduct>(`${this.cashierUrl}/products/barcode/${barcode}`, { params });
  }

  /**
   * Get quick products (favorites)
   */
  getQuickProducts(): Observable<QuickProduct[]> {
    return this.http.get<QuickProduct[]>(`${this.cashierUrl}/products/quick`);
  }

  // ==================== POS Invoice ====================

  /**
   * Create POS invoice
   */
  createInvoice(invoice: POSInvoice): Observable<POSInvoice> {
    return this.http.post<POSInvoice>(`${this.cashierUrl}/invoice`, invoice);
  }

  /**
   * Process payment
   */
  processPayment(payment: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.cashierUrl}/payment`, payment);
  }

  /**
   * Combined checkout: create invoice + process payment in one request.
   * Eliminates race condition between separate invoice/payment calls.
   */
  checkout(invoice: POSInvoice, idempotencyKey?: string): Observable<any> {
    let headers = new HttpHeaders();
    if (idempotencyKey) {
      headers = headers.set('Idempotency-Key', idempotencyKey);
    }
    return this.http.post<any>(`${this.cashierUrl}/checkout`, invoice, { headers });
  }

  // ==================== Held Orders ====================

  createHeldOrder(payload: CashierHeldOrderRequest): Observable<any> {
    return this.http.post<any>(`${this.cashierUrl}/held-orders`, payload);
  }

  getHeldOrders(params: {
    storeDetailsId?: string;
    sessionId?: number;
    terminalId?: string;
  }): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params.storeDetailsId && params.storeDetailsId.trim() !== '') {
      httpParams = httpParams.set('storeDetailsId', params.storeDetailsId);
    }
    if (params.sessionId !== undefined && params.sessionId !== null) {
      httpParams = httpParams.set('sessionId', params.sessionId.toString());
    }
    if (params.terminalId && params.terminalId.trim() !== '') {
      httpParams = httpParams.set('terminalId', params.terminalId);
    }

    return this.http.get<any>(`${this.cashierUrl}/held-orders`, { params: httpParams }).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.items)) return response.items;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.result)) return response.result;
        if (Array.isArray(response?.result?.items)) return response.result.items;
        return [];
      })
    );
  }

  deleteHeldOrder(id: string, restore = false): Observable<any> {
    const params = restore ? new HttpParams().set('restore', 'true') : undefined;
    return this.http.delete<any>(`${this.cashierUrl}/held-orders/${encodeURIComponent(id)}`, { params });
  }

  /**
   * Get invoice by ID
   */
  getInvoice(invoiceId: number): Observable<POSInvoice> {
    return this.http.get<POSInvoice>(`${this.cashierUrl}/invoice/${invoiceId}`);
  }

  /**
   * Refund invoice
   */
  refundInvoice(invoiceId: number, reason: string): Observable<POSInvoice> {
    return this.http.post<POSInvoice>(`${this.cashierUrl}/invoice/${invoiceId}/refund`, { reason });
  }

  /**
   * Search invoice for refund
   */
  searchInvoiceForRefund(term: string): Observable<any> {
    return this.http.get<any>(`${this.cashierUrl}/refund/search-invoice`, {
      params: { term }
    });
  }

  /**
   * Create a refund
   */
  createRefund(request: any): Observable<any> {
    return this.http.post<any>(`${this.cashierUrl}/refund`, request);
  }

  /**
   * Get refund history
   */
  getRefundHistory(status?: string, search?: string): Observable<any> {
    let params = new HttpParams();
    if (status && status !== 'all') params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.cashierUrl}/refund/history`, { params });
  }

  /**
   * Get session invoices
   */
  getSessionInvoices(sessionId: number): Observable<POSInvoice[]> {
    return this.http.get<POSInvoice[]>(`${this.cashierUrl}/session/${sessionId}/invoices`);
  }

  /**
   * Print receipt
   */
  printReceipt(invoiceId: number): Observable<Blob> {
    return this.http.get(`${this.cashierUrl}/invoice/${invoiceId}/receipt`, {
      responseType: 'blob'
    });
  }

  // ==================== Reports ====================

  /**
   * Get daily sales report
   */
  getDailySalesReport(date: Date): Observable<any> {
    const params = new HttpParams().set('date', date.toISOString());
    return this.http.get(`${this.cashierUrl}/reports/daily-sales`, { params });
  }

  /**
   * Get cashier performance report
   */
  getCashierPerformance(cashierId: number, fromDate: Date, toDate: Date): Observable<any> {
    const params = new HttpParams()
      .set('cashierId', cashierId.toString())
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toISOString());
    
    return this.http.get(`${this.cashierUrl}/reports/performance`, { params });
  }

  /**
   * Add cash action (in/out) to a session
   */
  addCashAction(sessionId: number, type: 'in' | 'out', amount: number, reason: string): Observable<any> {
    return this.http.post(`${this.cashierUrl}/session/${sessionId}/cash-action`, {
      actionType: type === 'in' ? 'CASH_IN' : 'CASH_OUT',
      amount,
      notes: reason
    });
  }

  /**
   * Get server-calculated Z-Report
   */
  getZReport(sessionId: number): Observable<any> {
    return this.http.get<any>(`${this.cashierUrl}/session/${sessionId}/z-report`);
  }
}
