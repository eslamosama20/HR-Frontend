import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { InventoryStocktakingModel } from 'src/app/models/inventory-stocktaking/inventoryStocktaking.model';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryStocktakingService extends ServiceBase<InventoryStocktakingModel> {
  private baseApiUrl: string;

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "inventoryStocktaking", InventoryStocktakingModel, Servers.inventoryUrl);
    this.baseApiUrl = environment.server_urls[environment.active_server].baseApi;
  }

  getReport(): Observable<Blob> {
    return this.http.get(`${this.baseApiUrl}inventory/inventoryStocktaking/report/document`, { responseType: 'blob' });
  }

  shareReport(shareRequest: { method: string; email?: string | null; phone?: string | null }): Observable<any> {
    return this.http.post(`${this.baseApiUrl}inventory/inventoryStocktaking/report/share`, shareRequest);
  }
}
