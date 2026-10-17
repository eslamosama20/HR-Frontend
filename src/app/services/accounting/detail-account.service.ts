import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { DetailAccountModel } from 'src/app/models/accounting/detailAccount.model';

@Injectable({
  providedIn: 'root'
})
export class DetailAccountService extends ServiceBase<DetailAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "detailAccount", DetailAccountModel, Servers.accountingUrl);
  }
}
