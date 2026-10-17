import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ZidActionResponse, ZidStockSyncResult } from 'src/app/models/cashier/zid-integration.model';
import { ZidApiService } from './zid-api.service';

@Injectable({
  providedIn: 'root'
})
export class ZidStockSyncService {
  constructor(private zidApi: ZidApiService) {}

  syncAllStock(storeDetailsId: string): Observable<ZidStockSyncResult> {
    return this.zidApi.syncStock(storeDetailsId);
  }

  updateProductStock(zidProductId: string | number, quantity: number): Observable<ZidActionResponse> {
    return this.zidApi.updateProductStock(zidProductId, quantity);
  }
}
