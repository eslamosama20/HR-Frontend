import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {InventoryPermitModel} from "../../models/permits/inventory-permit.model";
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryPermitService extends ServiceBase<InventoryPermitModel> {
  private baseUrl = environment.server_urls[environment.active_server].baseApi;
  
  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "inventoryPermit", InventoryPermitModel, Servers.baseApi);
  }

  getByStoreId(storeId: string): Observable<InventoryPermitModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}?StoreDetailsId=${storeId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        return list.map((item: Partial<InventoryPermitModel>) => new this.entityConstructor(item));
      })
    );
  }

  getReport(startDate?: Date, endDate?: Date): Observable<Blob> {
    const baseUrlClean = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    let url = `${baseUrlClean}/${this.endpoint}/Report/permits-document`;
    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate.toISOString()}`);
    if (endDate) params.push(`endDate=${endDate.toISOString()}`);
    if (params.length > 0) url += '?' + params.join('&');
    return this.http.get(url, { responseType: 'blob' });
  }

  shareReport(method: string, receiver: string, startDate?: Date, endDate?: Date): Observable<any> {
    const baseUrlClean = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const url = `${baseUrlClean}/${this.endpoint}/Report/permits-share`;
    return this.http.post(url, { 
      startDate, 
      endDate, 
      method, 
      receiver,
      language: 'ar'
    });
  }
}

