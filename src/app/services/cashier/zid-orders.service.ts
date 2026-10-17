import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ZidActionResponse,
  ZidCashierOrdersResponse,
  ZidOrder,
  ZidOrderFilter,
  ZidOrderListResponse,
  ZidOrderStatus
} from 'src/app/models/cashier/zid-integration.model';
import { ZidApiService } from './zid-api.service';

@Injectable({
  providedIn: 'root'
})
export class ZidOrdersService {
  constructor(private zidApi: ZidApiService) {}

  getOrders(filter?: ZidOrderFilter): Observable<ZidOrderListResponse> {
    return this.zidApi.getOrders(filter);
  }

  getOrderDetails(orderId: string): Observable<ZidOrder> {
    return this.zidApi.getOrderDetails(orderId);
  }

  syncOrder(orderId: string, storeDetailsId: string): Observable<ZidActionResponse> {
    return this.zidApi.syncOrder(orderId, storeDetailsId);
  }

  updateOrderStatus(orderId: string, status: ZidOrderStatus): Observable<ZidActionResponse> {
    return this.zidApi.updateOrderStatus(orderId, { status });
  }

  getCashierOrders(storeDetailsId: string): Observable<ZidCashierOrdersResponse> {
    return this.zidApi.getCashierOrders(storeDetailsId);
  }
}
