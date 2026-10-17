import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { RootPurchaseClassModel } from 'src/app/models/purchase-classes-tree/rootPurchaseClass.model';

@Injectable({
  providedIn: 'root'
})
export class RootPurchaseClassService extends ServiceBase<RootPurchaseClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "rootPurchaseClass", RootPurchaseClassModel, Servers.accountingUrl);
  }
}
