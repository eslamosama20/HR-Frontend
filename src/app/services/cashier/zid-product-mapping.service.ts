import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ZidActionResponse,
  ZidMapProductRequest,
  ZidProductListResponse
} from 'src/app/models/cashier/zid-integration.model';
import { ZidApiService } from './zid-api.service';

@Injectable({
  providedIn: 'root'
})
export class ZidProductMappingService {
  constructor(private zidApi: ZidApiService) {}

  getProducts(page = 1, pageSize = 20, mappedOnly?: boolean | null): Observable<ZidProductListResponse> {
    return this.zidApi.getProducts(page, pageSize, mappedOnly);
  }

  syncProducts(): Observable<ZidActionResponse> {
    return this.zidApi.syncProducts();
  }

  mapProduct(request: ZidMapProductRequest): Observable<ZidActionResponse> {
    return this.zidApi.mapProduct(request);
  }

  bulkMapProducts(mappings: ZidMapProductRequest[]): Observable<ZidActionResponse> {
    return this.zidApi.bulkMapProducts(mappings);
  }
}
