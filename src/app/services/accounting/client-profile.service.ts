import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { ClientProfileModel } from 'src/app/models/accounting/clientProfile.model';

@Injectable({
  providedIn: 'root'
})
export class ClientProfileService extends ServiceBase<ClientProfileModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "clientProfile", ClientProfileModel, Servers.accountingUrl);
  }
}
