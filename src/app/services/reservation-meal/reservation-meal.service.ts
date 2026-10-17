import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { ReservationMealModel } from 'src/app/models/accounting/reservation-meal-model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReservationMealService  extends ServiceBase<ReservationMealModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "reservationMeal", ReservationMealModel, Servers.baseApi);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<ReservationMealModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<ReservationMealModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(reservationMealId: string): Observable<ReservationMealModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${reservationMealId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
