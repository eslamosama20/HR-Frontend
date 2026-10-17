import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { CompanyDocumentModel } from '../../models/hr/company-document.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyDocumentService extends ServiceBase<CompanyDocumentModel> {
  constructor(private apiCallerService: ApiCallerService) {
    super(apiCallerService, "companydocument", CompanyDocumentModel, Servers.hrUrl);
  }

  getExpiring(days: number = 30): Observable<CompanyDocumentModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/expiring?days=${days}`;
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<CompanyDocumentModel>) => new CompanyDocumentModel(item)))
    );
  }

  getCritical(): Observable<CompanyDocumentModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/critical`;
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<CompanyDocumentModel>) => new CompanyDocumentModel(item)))
    );
  }
}
