import { Injectable } from '@angular/core';
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import {Servers} from "../../enums/servers";
import {environment} from "../../../environments/environment";
import {SupplierReportRecord} from "../../models/reports/supplierReportRecord.model";
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupplierReportService {
  private endpoint = 'supplierReport';
  constructor(
    protected apiCaller: ApiCallerService,
  ) { }

  getSupplierReport(
    id: string,
    startDate: string,
    endDate: string,
    reportType: number
  ): any {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = 'reportUrl';
    request.body = {
      id: id,
      startDate: startDate,
      endDate: endDate,
      reportType: reportType
    };
    return this.apiCaller.callApi(request).pipe(
      map(data => (data.data ?? []))
    )
  }
}
