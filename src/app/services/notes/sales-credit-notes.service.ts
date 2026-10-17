import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {SalesCreditNoteModel} from "../../models/notes/salesCreditNote.model";
import {Observable} from "rxjs";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {map} from "rxjs/operators";
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SalesCreditNotesService extends ServiceBase<SalesCreditNoteModel> {
  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "salesCreditNote", SalesCreditNoteModel,Servers.notes);
  }


  createSalesCreditNoteTransaction(id: string): Observable<SalesCreditNoteModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/createTransaction?salesCreditNoteId=${id}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  clearSalesCreditNote(id: string): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/clearCreditNote`;
    request.server_url = this.server_url;
    request.body = {
      id: id,
    }
    return this.apiCaller.callApi(request);
  }

  // Get Sales Credit Note VAT Details
  GetSalesCreditNoteVATDetails(startDate: string, endDate: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/VATReport?startDate=${startDate}&endDate=${endDate}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  // Share Sales Credit Note VAT Report by Email
  shareSalesCreditNoteVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/Report/VAT/share`;
    request.server_url = this.server_url;
    request.body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.apiCaller.callApi(request);
  }

  // Share Sales Credit Note VAT Report by WhatsApp
  shareSalesCreditNoteVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/Report/VAT/share`;
    request.server_url = this.server_url;
    request.body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.apiCaller.callApi(request);
  }

  // Download Sales Credit Note VAT Report Document
  downloadSalesCreditNoteVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${environment.server_urls[environment.active_server].baseApi}notes/salesCreditNote/Report/VAT/download?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
