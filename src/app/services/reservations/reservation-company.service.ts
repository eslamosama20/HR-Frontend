import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ReservationCompany } from 'src/app/models/accounting/reservation-company';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReservationCompanyService extends ServiceBase<ReservationCompany> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "reservationCompany", ReservationCompany, Servers.baseApi);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<ReservationCompany[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<ReservationCompany>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(reservationCompanyId: string): Observable<ReservationCompany> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${reservationCompanyId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  syncLegacyCompanies(): Observable<string> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/sync-legacy-companies`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }
}

