import { Injectable } from '@angular/core';
import { ApiCallerService, APIRequest, HTTPVerbs } from "../api-caller.service";
import { map } from 'rxjs';
import { InventoryReportRecord } from 'src/app/models/reports/inventoryReportRecord.model';
import {PurchasableCardReportModel} from "../../models/reports/purchasableCardReport/purchasableCardReport.model";

@Injectable({
  providedIn: 'root'
})
export class PurchasableCardReportService {
  private endpoint = 'purchasableCardReport';

  constructor(
    protected apiCaller: ApiCallerService,
  ) { }
  getPurchasableCardReport(mainPurchaseClassId: string, startDate: string, endDate: string): any {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = 'reportUrl';
    request.body = {
      mainPurchaseClassId: mainPurchaseClassId,
      startDate: startDate,
      endDate: endDate
    };
    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: PurchasableCardReportModel) => new PurchasableCardReportModel(item)))
    );
  }
}
