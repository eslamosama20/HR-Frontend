import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {FinancePeriodsModel} from "../../models/FinancePeriods/FinancePeriods.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class FinancePeriodsService extends ServiceBase<FinancePeriodsModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "financePeriods", FinancePeriodsModel, Servers.baseApi);
  }
}
