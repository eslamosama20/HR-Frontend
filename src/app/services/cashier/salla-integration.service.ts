import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  SallaSettings,
  SallaProductListResponse,
  SallaMapProductRequest,
  SallaBulkMapRequest,
  SallaSyncStockRequest,
  SallaSyncStockResponse,
  SallaOrderListResponse,
  SallaOrder,
  SallaOrderFilter,
  SallaCashierOrdersResponse,
  SallaSyncToInvoiceRequest,
  SallaSyncToInvoiceResponse,
  SallaUpdateStatusRequest,
  SallaSyncLogListResponse,
  SallaSyncLogFilter,
  SallaActionResponse
} from 'src/app/models/cashier/salla-integration.model';

/**
 * Salla Integration Service — خدمة تكامل سلة
 *
 * Wraps all Salla integration backend APIs.
 * Base path: /api/integrations/salla
 *
 * This service does NOT contain any pharmacy-specific logic.
 * It is designed for normal cashier (POS) mode only.
 */
@Injectable({
  providedIn: 'root'
})
export class SallaIntegrationService {
  private readonly baseUrl: string;
  private readonly sallaUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.server_urls[environment.active_server].baseApi;
    this.sallaUrl = `${this.baseUrl}integrations/salla`;
  }

  // =====================================================
  // 1. Settings & Dashboard
  // =====================================================

  /**
   * Get Salla integration connection status and dashboard statistics.
   * GET /api/integrations/salla/settings
   */
  getSettings(): Observable<SallaSettings> {
    return this.http.get<SallaSettings>(`${this.sallaUrl}/settings`);
  }

  // =====================================================
  // 2. Product Management
  // =====================================================

  /**
   * Get paginated list of Salla products with their mapping status.
   * GET /api/integrations/salla/products
   *
   * @param page - Page number (default 1)
   * @param pageSize - Items per page (default 20)
   * @param mappedOnly - true=mapped only, false=unmapped only, null=all
   */
  getProducts(page: number = 1, pageSize: number = 20, mappedOnly?: boolean | null): Observable<SallaProductListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (mappedOnly !== null && mappedOnly !== undefined) {
      params = params.set('mappedOnly', mappedOnly.toString());
    }

    return this.http.get<SallaProductListResponse>(`${this.sallaUrl}/products`, { params });
  }

  /**
   * Pull/sync all products from the Salla store into ERP.
   * POST /api/integrations/salla/products/sync
   */
  syncProductsFromSalla(): Observable<SallaActionResponse> {
    return this.http.post<SallaActionResponse>(`${this.sallaUrl}/products/sync`, {});
  }

  /**
   * Map a single Salla product to an ERP ProductUnit.
   * POST /api/integrations/salla/products/map
   */
  mapProduct(request: SallaMapProductRequest): Observable<SallaActionResponse> {
    return this.http.post<SallaActionResponse>(`${this.sallaUrl}/products/map`, request);
  }

  /**
   * Map multiple Salla products to ERP ProductUnits in one call.
   * POST /api/integrations/salla/products/bulk-map
   */
  bulkMapProducts(request: SallaBulkMapRequest): Observable<SallaActionResponse> {
    return this.http.post<SallaActionResponse>(`${this.sallaUrl}/products/bulk-map`, request);
  }

  /**
   * Push all ERP stock quantities to Salla for a specific store.
   * POST /api/integrations/salla/products/sync-all-stock
   *
   * Called automatically when cashier session opens,
   * or manually from the dashboard.
   */
  syncAllStock(request: SallaSyncStockRequest): Observable<SallaSyncStockResponse> {
    return this.http.post<SallaSyncStockResponse>(`${this.sallaUrl}/products/sync-all-stock`, request);
  }

  // =====================================================
  // 3. Orders Management
  // =====================================================

  /**
   * Get paginated list of Salla orders with optional filters.
   * GET /api/integrations/salla/orders
   */
  getOrders(filter?: SallaOrderFilter): Observable<SallaOrderListResponse> {
    let params = new HttpParams()
      .set('page', (filter?.page ?? 1).toString())
      .set('pageSize', (filter?.pageSize ?? 20).toString());

    if (filter?.status !== null && filter?.status !== undefined) {
      params = params.set('status', filter.status.toString());
    }

    if (filter?.syncStatus !== null && filter?.syncStatus !== undefined) {
      params = params.set('syncStatus', filter.syncStatus.toString());
    }

    return this.http.get<SallaOrderListResponse>(`${this.sallaUrl}/orders`, { params });
  }

  /**
   * Get detailed information about a specific order, including line items.
   * GET /api/integrations/salla/orders/{orderId}
   */
  getOrderDetails(orderId: string): Observable<SallaOrder> {
    return this.http.get<SallaOrder>(`${this.sallaUrl}/orders/${orderId}`);
  }

  /**
   * Get pending Salla orders for the cashier screen of a specific store.
   * GET /api/integrations/salla/orders/cashier/{storeId}
   *
   * This is the primary endpoint used by the POS dashboard
   * to show pending online orders.
   */
  getCashierOrders(storeId: string): Observable<SallaCashierOrdersResponse> {
    return this.http.get<SallaCashierOrdersResponse>(`${this.sallaUrl}/orders/cashier/${storeId}`);
  }

  /**
   * Convert a Salla order into an ERP Sale Invoice.
   * POST /api/integrations/salla/orders/{orderId}/sync-to-invoice
   *
   * Prerequisites:
   * - All order items must be mapped (isMapped === true)
   * - Order must not be already synced
   * - Store must have sufficient stock
   */
  syncToInvoice(orderId: string, request: SallaSyncToInvoiceRequest): Observable<SallaSyncToInvoiceResponse> {
    return this.http.post<SallaSyncToInvoiceResponse>(
      `${this.sallaUrl}/orders/${orderId}/sync-to-invoice`,
      request
    );
  }

  /**
   * Update order status on Salla (customer will be notified).
   * PUT /api/integrations/salla/orders/{orderId}/status
   *
   * Valid status transitions:
   * - 1 = InProgress (order is being prepared)
   * - 2 = Completed (order delivered)
   * - 3 = Cancelled
   */
  updateOrderStatus(orderId: string, request: SallaUpdateStatusRequest): Observable<SallaActionResponse> {
    return this.http.put<SallaActionResponse>(
      `${this.sallaUrl}/orders/${orderId}/status`,
      request
    );
  }

  // =====================================================
  // 4. Sync Logs & Monitoring
  // =====================================================

  /**
   * Get sync operation logs for monitoring and debugging.
   * GET /api/integrations/salla/sync-logs
   */
  getSyncLogs(filter?: SallaSyncLogFilter): Observable<SallaSyncLogListResponse> {
    let params = new HttpParams()
      .set('page', (filter?.page ?? 1).toString())
      .set('pageSize', (filter?.pageSize ?? 50).toString());

    if (filter?.eventType) {
      params = params.set('eventType', filter.eventType);
    }

    return this.http.get<SallaSyncLogListResponse>(`${this.sallaUrl}/sync-logs`, { params });
  }
}
