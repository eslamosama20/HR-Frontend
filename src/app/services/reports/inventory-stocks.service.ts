import { Injectable } from '@angular/core';
import { ApiCallerService, APIRequest, HTTPVerbs } from "../api-caller.service";
import {map, Observable} from 'rxjs';
import { InventoryReportRecord } from 'src/app/models/reports/inventoryReportRecord.model';
import {InventoryStocksModel} from "../../models/reports/inventory-stocks/inventoryStocks.model";

@Injectable({
  providedIn: 'root'
})
export class InventoryStocksService {
  private endpoint = 'inventoryStocks';

  constructor(
    protected apiCaller: ApiCallerService,
  ) { }
  getInventoryStocks(storeDetailsId?: string): Observable<InventoryStocksModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = storeDetailsId ? this.endpoint + `?storeDetailsId=${storeDetailsId}` : this.endpoint
    request.server_url = 'reportUrl';

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: InventoryStocksModel) => new InventoryStocksModel(item)))
    );
  }
}
