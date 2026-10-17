import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Servers } from 'src/app/enums/servers';
import { PublicPaidServiceModel } from 'src/app/models/public-booking/public-paid-service.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';

@Injectable({
  providedIn: 'root'
})
export class PublicPaidServiceService extends ServiceBase<PublicPaidServiceModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "PublicPaidService", PublicPaidServiceModel, Servers.baseApi);
  }

  getAllActive(): Observable<PublicPaidServiceModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/active`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map(
          (item: Partial<PublicPaidServiceModel>) => new PublicPaidServiceModel(item)
        );
      })
    );
  }
}
