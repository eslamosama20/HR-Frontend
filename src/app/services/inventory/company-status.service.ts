import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {CompanyStatusModel} from "../../models/inventory/companyStatus.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class CompanyStatusService extends ServiceBase<CompanyStatusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "companyStatus", CompanyStatusModel, Servers.inventoryUrl);
  }
}
