import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {BonusModel} from "../../models/hr/bonus.model";
import {PaymentResultModel} from "../../models/hr/payment-result.model";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {OvertimePaymentResultModel} from "../../models/hr/overtime-payment-result.model";

@Injectable({
  providedIn: 'root'
})
export class PaymentCalculatorService  {
  endpoint = "paymentCalculator";
  entityConstructor = PaymentResultModel;
  server_url = Servers.hrUrl;
  constructor(
    protected apiCaller: ApiCallerService,
  ) {
  }

  getPaymentResults(date: string): Observable<PaymentResultModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}?date=${date}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data =>new PaymentResultModel(data))
    );
  }

  getOvertimePaymentResults(date: string): Observable<OvertimePaymentResultModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/overtime-payments?date=${date}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data =>new OvertimePaymentResultModel(data))
    );
  }
}
