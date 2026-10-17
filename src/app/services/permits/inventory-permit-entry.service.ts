import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {InventoryPermitModel} from "../../models/permits/inventory-permit.model";
import {InventoryPermitEntryModel} from "../../models/permits/inventory-permit-entry.model";

@Injectable({
  providedIn: 'root'
})
export class InventoryPermitEntryService extends ServiceBase<InventoryPermitEntryModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "inventoryPermitEntry", InventoryPermitEntryModel, Servers.baseApi);
  }
}
