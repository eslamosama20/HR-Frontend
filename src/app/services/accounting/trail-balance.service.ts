import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {TrailBalanceRootDataModel} from "../../models/accounting/trailBalanceRootData.model";
import {map} from "rxjs/operators";
import {Observable} from "rxjs";
import { PdfUtilsService } from '../pdf-utils.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrailBalanceService {
  server_url = Servers.accountingUrl;
  endpoint = 'trailBalance';
  private baseUrl = environment.server_urls[environment.active_server][this.server_url];
  
  constructor(
    protected apiCaller: ApiCallerService,
    private http: HttpClient,
    private pdfUtilsService: PdfUtilsService
  ) {
  }

  getTrailBalance(startDate: string, endDate: string) : Observable<TrailBalanceRootDataModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}?startDate=${startDate}&endDate=${endDate}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<TrailBalanceRootDataModel>) => new TrailBalanceRootDataModel(item)))
    );
  }

  shareTrialBalanceByEmail(startDate: string, endDate: string, level: string, email: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/share`;
    request.body = {
      startDate,
      endDate,
      level,
      method: 'Email',
      receiver: email
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  shareTrialBalanceByWhatsapp(startDate: string, endDate: string, level: string, phone: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/whatsappShare`;
    request.body = {
      startDate,
      endDate,
      level,
      method: 'WhatsApp',
      receiver: phone
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  printDocument(startDate: string, endDate: string, level: string): void {
    const url = `${this.baseUrl}${this.endpoint}/document?startDate=${startDate}&endDate=${endDate}&level=${level}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  downloadDocument(startDate: string, endDate: string, level: string): void {
    const url = `${this.baseUrl}${this.endpoint}/document?startDate=${startDate}&endDate=${endDate}&level=${level}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      const fileName = `trial-balance-${level}-${startDate}-${endDate}.pdf`;
      this.pdfUtilsService.downloadFile(data, fileName);
    });
  }
}
