import { Injectable } from '@angular/core';
import { Servers } from 'src/app/enums/servers';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import { ApiCallerService } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { ExpenseCenters } from 'src/app/models/expensesCenters/expense-centers';

@Injectable({
  providedIn: 'root'
})
export class ExpenseCenterService extends ServiceBase<ExpenseCenters> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "expensesCenter", CustomerProfileModel, Servers.baseApi);
  }
}
