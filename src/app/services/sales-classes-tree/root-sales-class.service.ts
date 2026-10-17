import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { RootSalesClassModel } from 'src/app/models/sales-classes-tree/rootSalesClass.model';

@Injectable({
  providedIn: 'root'
})
export class RootSalesClassService extends ServiceBase<RootSalesClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "rootSalesClass", RootSalesClassModel, Servers.accountingUrl);
  }
}
