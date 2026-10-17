import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {ProductUnitStatusModel} from "../../models/inventory/productUnitStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class ProductUnitStatusService extends ServiceBase<ProductUnitStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "productUnitStatus", ProductUnitStatusModel, Servers.inventoryUrl);
  }
}
