import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {StoreStatusModel} from "../../models/inventory/storeStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class StoreStatusService extends ServiceBase<StoreStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "storeStatus", StoreStatusModel, Servers.inventoryUrl);
  }
}
