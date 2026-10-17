import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ProductUnitModel} from "../../models/inventory/productUnit.model";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {InventoryServiceBaseService} from "../base/inventory-service-base.service";

@Injectable({
  providedIn: 'root'
})
export class ProductUnitService extends InventoryServiceBaseService<ProductUnitModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "productUnit", ProductUnitModel, Servers.inventoryUrl);
  }
}
