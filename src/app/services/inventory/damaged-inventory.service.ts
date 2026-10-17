import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceBase } from '../base/service-base.service';
import { DamagedInventoryModel } from '../../models/inventory/damagedInventory.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DamagedInventoryService extends ServiceBase<DamagedInventoryModel> {
  private baseApiUrl: string;

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "damagedInventory", DamagedInventoryModel, Servers.inventoryUrl);
    this.baseApiUrl = environment.server_urls[environment.active_server].baseApi;
  }

  getStoreProducts(storeId: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/store/${storeId}/products`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  getFiltered(filters: any): Observable<DamagedInventoryModel[]> {
    // Use getAll from base service - it works correctly
    return this.getAll();
  }

  // PDF Report
  getPdfReport(): Observable<Blob> {
    return this.http.get(
      `${this.baseApiUrl}inventory/damagedInventory/Report/damaged-document`,
      { responseType: 'blob' }
    );
  }

  // Excel Export
  exportToExcel(): Observable<Blob> {
    return this.http.get(
      `${this.baseApiUrl}inventory/damagedInventory/excel`,
      { responseType: 'blob' }
    );
  }

  // Share via Email
  shareViaEmail(email: string): Observable<any> {
    return this.http.post(
      `${this.baseApiUrl}inventory/damagedInventory/Report/damaged-share`,
      { method: 'email', receiver: email }
    );
  }

  // Share via WhatsApp
  shareViaWhatsApp(phoneNumber: string): Observable<any> {
    return this.http.post(
      `${this.baseApiUrl}inventory/damagedInventory/Report/damaged-whatsappShare`,
      { method: 'whatsapp', receiver: phoneNumber }
    );
  }
}
