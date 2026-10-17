import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ReservationView } from 'src/app/models/accounting/reservation-view';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReservationViewService extends ServiceBase<ReservationView> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "reservationView", ReservationView, Servers.baseApi);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<ReservationView[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<ReservationView>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(reservationViewId: string): Observable<ReservationView> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${reservationViewId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
