import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {MonthlyLoanModel} from "../../models/hr/monthly-loan.model";

@Injectable({
  providedIn: 'root'
})
export class MonthlyLoanService extends ServiceBase<MonthlyLoanModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "monthlyLoan", MonthlyLoanModel, Servers.hrUrl);
  }
}
