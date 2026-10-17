import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ZidActionResponse,
  ZidCashierOrdersResponse,
  ZidMapProductRequest,
  ZidOAuthUrlResponse,
  ZidOrder,
  ZidOrderFilter,
  ZidOrderListResponse,
  ZidSetTokenRequest,
  ZidSettings,
  ZidStockSyncResult,
  ZidSyncLogFilter,
  ZidSyncLogListResponse,
  ZidUpdateOrderStatusRequest,
  ZidProductListResponse
} from 'src/app/models/cashier/zid-integration.model';
import { mapZidSettingsResponse, mapZidOAuthUrlResponse, mapZidActionResponse } from 'src/app/adapters/cashier/zid-settings.adapter';
import { mapZidCashierOrdersResponse, mapZidOrder, mapZidOrderActionResponse, mapZidOrderListResponse } from 'src/app/adapters/cashier/zid-order.adapter';
import { mapZidProductActionResponse, mapZidProductListResponse } from 'src/app/adapters/cashier/zid-product.adapter';
import { mapZidStockActionResponse, mapZidStockSyncResult } from 'src/app/adapters/cashier/zid-stock-sync.adapter';
import { mapZidSyncLogListResponse } from 'src/app/adapters/cashier/zid-log.adapter';

@Injectable({
  providedIn: 'root'
})
export class ZidApiService {
  private readonly zidUrl: string;

  constructor(private http: HttpClient) {
    const baseUrl = environment.server_urls[environment.active_server].baseApi;
    this.zidUrl = `${baseUrl}integrations/zid`;
  }

  getOAuthUrl(): Observable<ZidOAuthUrlResponse> {
    return this.http.get<any>(`${this.zidUrl}/oauth-url`).pipe(map(mapZidOAuthUrlResponse));
  }

  connect(code: string): Observable<ZidActionResponse> {
    return this.http.post<any>(`${this.zidUrl}/connect`, { code }).pipe(
      map(response => mapZidActionResponse(response))
    );
  }

  setToken(request: ZidSetTokenRequest): Observable<ZidActionResponse> {
    return this.http.post<any>(`${this.zidUrl}/set-token`, request).pipe(
      map(response => mapZidActionResponse(response))
    );
  }

  getSettings(): Observable<ZidSettings> {
    return this.http.get<any>(`${this.zidUrl}/settings`).pipe(map(mapZidSettingsResponse));
  }

  getOrders(filter?: ZidOrderFilter): Observable<ZidOrderListResponse> {
    let params = new HttpParams()
      .set('page', (filter?.page ?? 1).toString())
      .set('pageSize', (filter?.pageSize ?? 20).toString());

    if (filter?.status !== null && filter?.status !== undefined) {
      params = params.set('status', filter.status.toString());
    }

    if (filter?.syncStatus !== null && filter?.syncStatus !== undefined) {
      params = params.set('syncStatus', filter.syncStatus.toString());
    }

    return this.http.get<any>(`${this.zidUrl}/orders`, { params }).pipe(map(mapZidOrderListResponse));
  }

  getOrderDetails(orderId: string): Observable<ZidOrder> {
    return this.http.get<any>(`${this.zidUrl}/orders/${orderId}`).pipe(map(mapZidOrder));
  }

  syncOrder(orderId: string, storeDetailsId: string): Observable<ZidActionResponse> {
    return this.http.post<any>(`${this.zidUrl}/orders/${orderId}/sync`, { storeDetailsId }).pipe(map(mapZidOrderActionResponse));
  }

  updateOrderStatus(orderId: string, request: ZidUpdateOrderStatusRequest): Observable<ZidActionResponse> {
    return this.http.put<any>(`${this.zidUrl}/orders/${orderId}/status`, request).pipe(map(mapZidOrderActionResponse));
  }

  getProducts(page = 1, pageSize = 20, mappedOnly?: boolean | null): Observable<ZidProductListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (mappedOnly !== null && mappedOnly !== undefined) {
      params = params.set('mappedOnly', mappedOnly.toString());
    }

    return this.http.get<any>(`${this.zidUrl}/products`, { params }).pipe(map(mapZidProductListResponse));
  }

  syncProducts(): Observable<ZidActionResponse> {
    return this.http.post<any>(`${this.zidUrl}/products/sync`, {}).pipe(map(mapZidProductActionResponse));
  }

  mapProduct(request: ZidMapProductRequest): Observable<ZidActionResponse> {
    return this.http.put<any>(`${this.zidUrl}/products/${request.zidProductId}/map`, request).pipe(map(mapZidProductActionResponse));
  }

  bulkMapProducts(mappings: ZidMapProductRequest[]): Observable<ZidActionResponse> {
    return this.http.post<any>(`${this.zidUrl}/products/bulk-map`, mappings).pipe(map(mapZidProductActionResponse));
  }

  syncStock(storeDetailsId: string): Observable<ZidStockSyncResult> {
    const params = new HttpParams().set('storeDetailsId', storeDetailsId);
    return this.http.post<any>(`${this.zidUrl}/stock/sync`, {}, { params }).pipe(map(mapZidStockSyncResult));
  }

  updateProductStock(zidProductId: string | number, quantity: number): Observable<ZidActionResponse> {
    return this.http.put<any>(`${this.zidUrl}/products/${zidProductId}/stock`, quantity).pipe(map(mapZidStockActionResponse));
  }

  getCashierOrders(storeDetailsId: string): Observable<ZidCashierOrdersResponse> {
    const params = new HttpParams().set('storeDetailsId', storeDetailsId);
    return this.http.get<any>(`${this.zidUrl}/cashier/orders`, { params }).pipe(map(mapZidCashierOrdersResponse));
  }

  getLogs(filter?: ZidSyncLogFilter): Observable<ZidSyncLogListResponse> {
    let params = new HttpParams()
      .set('page', (filter?.page ?? 1).toString())
      .set('pageSize', (filter?.pageSize ?? 50).toString());

    if (filter?.eventType) {
      params = params.set('eventType', filter.eventType);
    }

    return this.http.get<any>(`${this.zidUrl}/logs`, { params }).pipe(map(mapZidSyncLogListResponse));
  }
}
