import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { MainSalesClassModel } from 'src/app/models/sales-classes-tree/mainSalesClass.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { APIRequest, HTTPVerbs } from '../api-caller.service';

@Injectable({
  providedIn: 'root'
})
export class MainSalesClassService extends ServiceBase<MainSalesClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "mainSalesClass", MainSalesClassModel, Servers.accountingUrl);
  }

  ensureItemsExist(itemNames: string[]): Observable<MainSalesClassModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/ensure-items-exist`;
    request.body = itemNames;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => {
        if (Array.isArray(data)) {
          return data.map((item: Partial<MainSalesClassModel>) => new this.entityConstructor(item));
        }
        if (data && data.message) {
          return [];
        }
        return [];
      })
    );
  }

  getReservationItems(): Observable<MainSalesClassModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint + '?IsReservationItem=true';
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => {
        if (Array.isArray(data)) {
          return data.map((item: Partial<MainSalesClassModel>) => new this.entityConstructor(item));
        }
        if (data && data.data && Array.isArray(data.data)) {
            return data.data.map((item: Partial<MainSalesClassModel>) => new this.entityConstructor(item));
        }
        return [];
      })
    );
  }
}
