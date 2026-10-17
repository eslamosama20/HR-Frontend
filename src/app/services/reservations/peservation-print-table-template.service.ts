import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import {ReservationPrintTableTemplateModel} from "../../models/reservation/reservation-print-table-template.model";

@Injectable({
  providedIn: 'root'
})
export class ReservationPrintTableTemplateService extends ServiceBase<ReservationPrintTableTemplateModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "reservationPrintTableTemplate", ReservationPrintTableTemplateModel, Servers.baseApi);
  }

  seedDefaultTemplates(): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/seed-defaults`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }
}
