import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { HeaderAccountModel } from 'src/app/models/accounting/headerAccount.model';

@Injectable({
  providedIn: 'root'
})
export class HeaderAccountService extends ServiceBase<HeaderAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "headerAccount", HeaderAccountModel, Servers.accountingUrl);
  }
}
