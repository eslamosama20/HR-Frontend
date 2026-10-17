import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {BranchStatusModel} from "../../models/inventory/branchStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class BranchStatusService extends ServiceBase<BranchStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "branchStatus", BranchStatusModel, Servers.inventoryUrl);
  }
}
