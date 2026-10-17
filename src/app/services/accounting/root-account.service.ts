import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { RootAccountModel } from 'src/app/models/accounting/rootAccount.model';

@Injectable({
  providedIn: 'root'
})
export class RootAccountService extends ServiceBase<RootAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "rootAccount", RootAccountModel, Servers.accountingUrl);
  }
}
