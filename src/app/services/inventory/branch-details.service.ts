import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {BranchDetailsModel} from "../../models/inventory/branchDetails.model";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class BranchDetailsService extends ServiceBase<BranchDetailsModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "branchDetails", BranchDetailsModel, Servers.inventoryUrl);
  }
}
