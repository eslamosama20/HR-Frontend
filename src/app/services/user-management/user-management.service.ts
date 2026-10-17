import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { Observable } from 'rxjs';
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class UserManagementService extends ServiceBase<UserAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "User", UserAccountModel, Servers.authUrl);
  }

  getAllFrontal(): Observable<UserAccountModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint + '/frontal';
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<UserAccountModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(id: string): Observable<UserAccountModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }
  updateUser(user: UserAccountModel): Observable<UserAccountModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = this.endpoint;    // /api/auth/User
    request.server_url = this.server_url;
    request.body = user;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  resetPassword(userId: string, newPassword: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/reset-password`;
    request.server_url = this.server_url;
    request.body = { userId, newPassword };

    return this.apiCaller.callApi(request);
  }
}

