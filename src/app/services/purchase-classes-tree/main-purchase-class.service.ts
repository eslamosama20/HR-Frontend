import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { MainPurchaseClassModel } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';

@Injectable({
  providedIn: 'root'
})
export class MainPurchaseClassService extends ServiceBase<MainPurchaseClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "mainPurchaseClass", MainPurchaseClassModel, Servers.accountingUrl);
  }
}
