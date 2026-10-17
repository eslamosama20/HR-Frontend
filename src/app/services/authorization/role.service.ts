import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import {SupplierStatusModel} from "../../models/inventory/supplierStatus.model";
import { Servers } from '../../enums/servers';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { RoleModel } from 'src/app/models/auth/role.model';
import { Observable } from 'rxjs';
import {ReservationMealModel} from "../../models/accounting/reservation-meal-model";
import {map} from "rxjs/operators";
@Injectable({
  providedIn: 'root'
})
export class RoleService extends ServiceBase<RoleModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "roles", RoleModel, Servers.authUrl);
  }

  getAllFrontal(): Observable<RoleModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint + '/frontal';
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<RoleModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(id: string): Observable<RoleModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
}
