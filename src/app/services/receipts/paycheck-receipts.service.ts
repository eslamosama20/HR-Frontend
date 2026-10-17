import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {PaycheckReceiptModel} from "../../models/receipts/paycheckReceipt.model";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class PaycheckReceiptsService extends ServiceBase<PaycheckReceiptModel> {
  // جلب كل السندات
  getAll(): Observable<PaycheckReceiptModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<PaycheckReceiptModel>) => new this.entityConstructor(item)))
    );
  }
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "paycheckReceipt", PaycheckReceiptModel,Servers.receipts);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<PaycheckReceiptModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<PaycheckReceiptModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(receiptId: string): Observable<PaycheckReceiptModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${receiptId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  /** جلب المبلغ المدفوع من كل السندات المرتبطة بفاتورة معينة */
  getInvoicePaidAmount(saleInvoiceId: number): Observable<number> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/invoice-paid-amount/${saleInvoiceId}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(response => {
        if (response && typeof response === 'object') {
          const candidate = (response as any).data ?? response;
          return Number(candidate ?? 0);
        }
        return Number(response ?? 0);
      })
    );
  }

  /** جلب المبلغ المتبقي في فاتورة معينة */
  getInvoiceRemainingAmount(saleInvoiceId: number): Observable<number> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/invoice-remaining-amount/${saleInvoiceId}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(response => {
        if (response && typeof response === 'object') {
          const candidate = (response as any).data ?? response;
          return Number(candidate ?? 0);
        }
        return Number(response ?? 0);
      })
    );
  }

  override delete(id: string, reason: string = 'إلغاء السند'): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/${id}?reason=${encodeURIComponent(reason)}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }
}
