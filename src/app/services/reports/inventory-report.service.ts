import { Injectable } from '@angular/core';
import { ApiCallerService, APIRequest, HTTPVerbs } from "../api-caller.service";
import { map } from 'rxjs';
import { InventoryReportRecord } from 'src/app/models/reports/inventoryReportRecord.model';
import { Servers } from 'src/app/enums/servers';

@Injectable({
  providedIn: 'root'
})
export class InventoryReportService {
  private endpoint = 'inventoryReport';

  constructor(
    protected apiCaller: ApiCallerService,
  ) { }




  getInventoryReport(storeId: string, startDate: string, endDate: string): any {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = Servers.inventoryUrl;
    request.body = {
      id: storeId,
      startDate: startDate,
      endDate: endDate
    };
    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: InventoryReportRecord) => new InventoryReportRecord(item)))
    );
  }
}
