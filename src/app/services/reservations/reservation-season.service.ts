import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ReservationSeason } from 'src/app/models/accounting/reservation-season';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReservationSeasonService  extends ServiceBase<ReservationSeason> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "reservationSeason", ReservationSeason, Servers.baseApi);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<ReservationSeason[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<ReservationSeason>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(reservationSeasonId: string): Observable<ReservationSeason> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${reservationSeasonId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
