import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { HeaderPurchaseClassModel } from 'src/app/models/purchase-classes-tree/headerPurchaseClass.model';

@Injectable({
  providedIn: 'root'
})
export class HeaderPurchaseClassService extends ServiceBase<HeaderPurchaseClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "headerPurchaseClass", HeaderPurchaseClassModel, Servers.accountingUrl);
  }
}
