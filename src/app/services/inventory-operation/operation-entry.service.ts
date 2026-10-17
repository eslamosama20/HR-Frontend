import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {InventoryPermitModel} from "../../models/permits/inventory-permit.model";
import {InventoryPermitEntryModel} from "../../models/permits/inventory-permit-entry.model";
import {OperationEntryModel} from "../../models/inventory-operation/operationEntry.model";

@Injectable({
  providedIn: 'root'
})
export class OperationEntryService extends ServiceBase<OperationEntryModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "operationEntry", OperationEntryModel, Servers.inventoryUrl);
  }
}
