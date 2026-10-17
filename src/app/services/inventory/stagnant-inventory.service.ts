import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceBase } from '../base/service-base.service';
import { StagnantInventoryModel } from '../../models/inventory/stagnantInventory.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StagnantInventoryService extends ServiceBase<StagnantInventoryModel> {
  private baseApiUrl: string;

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "StagnantInventory", StagnantInventoryModel, Servers.inventoryUrl);
    this.baseApiUrl = environment.server_urls[environment.active_server].baseApi;
  }

  getStoreProducts(storeId: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/store/${storeId}/products`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  getFiltered(filters: any): Observable<StagnantInventoryModel[]> {
    return this.getAll();
  }

  // Mark item as disposed
  markAsDisposed(id: string, disposalMethod: string): Observable<StagnantInventoryModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = `${this.endpoint}/${id}/dispose`;
    request.server_url = this.server_url;
    request.body = { disposalMethod };

    return this.apiCaller.callApi(request);
  }

  // PDF Report
  getPdfReport(): Observable<Blob> {
    return this.http.get(
      `${this.baseApiUrl}inventory/StagnantInventory/Report/stagnant-document`,
      { responseType: 'blob' }
    );
  }

  // Excel Export
  exportToExcel(): Observable<Blob> {
    return this.http.get(
      `${this.baseApiUrl}inventory/StagnantInventory/excel`,
      { responseType: 'blob' }
    );
  }

  // Share via Email
  shareViaEmail(email: string): Observable<any> {
    return this.http.post(
      `${this.baseApiUrl}inventory/StagnantInventory/Report/stagnant-share`,
      { method: 'email', receiver: email }
    );
  }

  // Share via WhatsApp
  shareViaWhatsApp(phoneNumber: string): Observable<any> {
    return this.http.post(
      `${this.baseApiUrl}inventory/StagnantInventory/Report/stagnant-whatsappShare`,
      { method: 'whatsapp', receiver: phoneNumber }
    );
  }
}
