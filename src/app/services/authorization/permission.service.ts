import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { RoleModel } from 'src/app/models/auth/role.model';
import {PermissionModel} from "../../models/auth/permission.model";

@Injectable({
  providedIn: 'root'
})
export class PermissionService extends ServiceBase<PermissionModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "permissions", PermissionModel, Servers.authUrl);
  }
}
