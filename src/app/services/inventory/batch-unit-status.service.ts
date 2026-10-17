import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {BatchUnitStatusModel} from "../../models/inventory/batchUnitStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class BatchUnitStatusService extends ServiceBase<BatchUnitStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "batchUnitStatus", BatchUnitStatusModel, Servers.inventoryUrl);
  }
}
