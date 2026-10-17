import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {InventoryPermitModel} from "../../models/permits/inventory-permit.model";
import {InventoryOperationModel} from "../../models/inventory-operation/inventoryOperation.model";

@Injectable({
  providedIn: 'root'
})
export class InventoryOperationService extends ServiceBase<InventoryOperationModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "inventoryOperation", InventoryOperationModel, Servers.inventoryUrl);
  }
}
