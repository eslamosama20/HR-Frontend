import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {StoreDetailsModel} from "../../models/inventory/storeDetails.model";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class StoreDetailsService extends ServiceBase<StoreDetailsModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "storeDetails", StoreDetailsModel, Servers.inventoryUrl);
  }
}
