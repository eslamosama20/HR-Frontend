import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { SalesRepresentative } from 'src/app/models/accounting/sales-representative';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SalesRepresentativeService extends ServiceBase<SalesRepresentative> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "salesRepresentative", SalesRepresentative, Servers.baseApi);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<SalesRepresentative[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<SalesRepresentative>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(salesRepresentativeId: string): Observable<SalesRepresentative> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${salesRepresentativeId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
