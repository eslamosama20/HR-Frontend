import {Injectable} from '@angular/core';
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { map, Observable } from 'rxjs';
import { UserRoleModel } from 'src/app/models/auth/userRole.model';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService{
  server_url = Servers.authUrl;
  constructor(private apiCaller: ApiCallerService,
  ){
  }

  assignRole(userRole : UserRoleModel): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = 'assignRole';
    request.server_url = this.server_url;
    request.body = {
      userId: userRole.userId,
      roleId: userRole.roleId
    };
    return this.apiCaller.callApi(request).pipe(
      map(() => null)
    );
  }

  assignRoles(userId: string, roleIds: string[]): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = 'assignRoles';
    request.server_url = this.server_url;
    request.body = {
      userId: userId,
      roleIds: roleIds
    };
    return this.apiCaller.callApi(request).pipe(
      map(() => null)
    );
  }

  unAssignRole(userRole : UserRoleModel): Observable<void> {

    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint =  'unassignRole';
    request.server_url = this.server_url;
    request.body = {
      userId: userRole.userId,
      roleId: userRole.roleId
    };
    return this.apiCaller.callApi(request).pipe(
      map(() => null)
    );
  }
}
