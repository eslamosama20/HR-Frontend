import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {PaymentReceiptModel} from "../../models/receipts/paymentReceipt.model";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class PaymentReceiptsService extends ServiceBase<PaymentReceiptModel> {
  /** جلب قيمة الفاتورة المرتبطة بسند القبض */
  getConnectedInvoiceAmount(invoiceId: string): Observable<number> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/connected-invoice-amount/${invoiceId}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(data => Number(data?.amount ?? 0))
    );
  }
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "paymentReceipt", PaymentReceiptModel,Servers.receipts);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<PaymentReceiptModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<PaymentReceiptModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(receiptId: string): Observable<PaymentReceiptModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${receiptId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
