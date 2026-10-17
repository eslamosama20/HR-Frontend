import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { ReservationSupplierModel } from 'src/app/models/accounting/reservation-supplier-model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ReservationSupplierService extends ServiceBase<ReservationSupplierModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "reservationSupplier", ReservationSupplierModel, Servers.baseApi);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<ReservationSupplierModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<ReservationSupplierModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(reservationSupplierId: string): Observable<ReservationSupplierModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${reservationSupplierId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
