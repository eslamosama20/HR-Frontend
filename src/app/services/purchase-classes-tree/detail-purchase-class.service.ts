import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { DetailPurchaseClassModel } from 'src/app/models/purchase-classes-tree/detailPurchaseClass.model';

@Injectable({
  providedIn: 'root'
})
export class DetailPurchaseClassService extends ServiceBase<DetailPurchaseClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "detailPurchaseClass", DetailPurchaseClassModel, Servers.accountingUrl);
  }
}
