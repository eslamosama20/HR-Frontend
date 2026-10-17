import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {BatchStatusModel} from "../../models/inventory/batchStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class BatchStatusService extends ServiceBase<BatchStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "batchStatus", BatchStatusModel, Servers.inventoryUrl);
  }
}
