import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceBase } from "../base/service-base.service";
import { ApiCallerService, APIRequest, HTTPVerbs } from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { MainAccountModel } from 'src/app/models/accounting/mainAccount.model';

@Injectable({
  providedIn: 'root'
})
export class MainAccountService extends ServiceBase<MainAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "mainAccount", MainAccountModel, Servers.accountingUrl);
  }

  getLookup(): Observable<MainAccountModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/lookup`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        return list.map((item: Partial<MainAccountModel>) => new MainAccountModel(item));
      })
    );
  }
}

