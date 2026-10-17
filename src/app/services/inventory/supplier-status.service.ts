import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {SupplierStatusModel} from "../../models/inventory/supplierStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class SupplierStatusService extends ServiceBase<SupplierStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "supplierStatus", SupplierStatusModel, Servers.inventoryUrl);
  }
}
