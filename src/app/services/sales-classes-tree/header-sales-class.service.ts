import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { HeaderSalesClassModel } from 'src/app/models/sales-classes-tree/headerSalesClass.model';

@Injectable({
  providedIn: 'root'
})
export class HeaderSalesClassService extends ServiceBase<HeaderSalesClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "headerSalesClass", HeaderSalesClassModel, Servers.accountingUrl);
  }
}
