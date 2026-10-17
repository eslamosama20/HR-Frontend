import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {map} from "rxjs/operators";
import {Observable} from "rxjs";
import {AccountStatementModel} from "../../models/accounting/accountStatement.model";
import {AccountStatementRecordModel} from "../../models/accounting/accountStatementRecord.model";
import { PdfUtilsService } from '../pdf-utils.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountStatementService {
  server_url = Servers.accountingUrl;
  endpoint = 'accountStatement';
  private baseUrl = environment.server_urls[environment.active_server][this.server_url];
  
  constructor(
    protected apiCaller: ApiCallerService,
    private http: HttpClient,
    private pdfUtilsService: PdfUtilsService
  ) {
  }

  getAccountStatement(startDate: string, endDate: string, accountId: string, isFrontal: boolean = false, projectId?: string) : Observable<AccountStatementModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    let endpoint = `${this.endpoint}?startDate=${startDate}&endDate=${endDate}&accountId=${accountId}`;
    if (projectId) {
      endpoint += `&projectId=${projectId}`;
    }
    if (isFrontal) {
      endpoint += '&isFrontal=true';
    }
    request.endpoint = endpoint;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ? {...data, accountStatementRecords: data.accountStatementRecords.map(ar => new AccountStatementRecordModel(ar))} : null))
    );
  }

  shareAccountStatementByEmail(startDate: string, endDate: string, accountId: string, email: string, isFrontal: boolean = false, projectId?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/share`;
    request.body = {
      startDate,
      endDate,
      accountId,
      projectId,
      isFrontal,
      method: 'Email',
      receiver: email
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  shareAccountStatementByWhatsapp(startDate: string, endDate: string, accountId: string, phone: string, isFrontal: boolean = false, projectId?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/whatsappShare`;
    request.body = {
      startDate,
      endDate,
      accountId,
      projectId,
      isFrontal,
      method: 'WhatsApp',
      receiver: phone
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  printDocument(startDate: string, endDate: string, accountId: string, isFrontal: boolean = false, projectId?: string): void {
    let url = `${this.baseUrl}${this.endpoint}/document?startDate=${startDate}&endDate=${endDate}&accountId=${accountId}`;
    if (projectId) {
      url += `&projectId=${projectId}`;
    }
    if (isFrontal) {
      url += '&isFrontal=true';
    }
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  downloadDocument(startDate: string, endDate: string, accountId: string, isFrontal: boolean = false, projectId?: string): void {
    let url = `${this.baseUrl}${this.endpoint}/document?startDate=${startDate}&endDate=${endDate}&accountId=${accountId}`;
    if (projectId) {
      url += `&projectId=${projectId}`;
    }
    if (isFrontal) {
      url += '&isFrontal=true';
    }
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      const fileName = `account-statement-${accountId}-${startDate}-${endDate}.pdf`;
      this.pdfUtilsService.downloadFile(data, fileName);
    });
  }

  // Summary Account Statement Methods
  shareSummaryAccountStatementByEmail(startDate: string, endDate: string, accountId: string, email: string, isFrontal: boolean = false, projectId?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/summary/share`;
    request.body = {
      startDate,
      endDate,
      accountId,
      projectId,
      isFrontal,
      method: 'Email',
      receiver: email
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  shareSummaryAccountStatementByWhatsapp(startDate: string, endDate: string, accountId: string, phone: string, isFrontal: boolean = false, projectId?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/summary/whatsappShare`;
    request.body = {
      startDate,
      endDate,
      accountId,
      projectId,
      isFrontal,
      method: 'WhatsApp',
      receiver: phone
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  printSummaryDocument(startDate: string, endDate: string, accountId: string, isFrontal: boolean = false, projectId?: string): void {
    let url = `${this.baseUrl}${this.endpoint}/summary/document?startDate=${startDate}&endDate=${endDate}&accountId=${accountId}`;
    if (projectId) {
      url += `&projectId=${projectId}`;
    }
    if (isFrontal) {
      url += '&isFrontal=true';
    }
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  downloadSummaryDocument(startDate: string, endDate: string, accountId: string, isFrontal: boolean = false, projectId?: string): void {
    let url = `${this.baseUrl}${this.endpoint}/summary/document?startDate=${startDate}&endDate=${endDate}&accountId=${accountId}`;
    if (projectId) {
      url += `&projectId=${projectId}`;
    }
    if (isFrontal) {
      url += '&isFrontal=true';
    }
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      const fileName = `summary-account-statement-${accountId}-${startDate}-${endDate}.pdf`;
      this.pdfUtilsService.downloadFile(data, fileName);
    });
  }
}
