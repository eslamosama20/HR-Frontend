import { Injectable } from '@angular/core';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { SalarySlipModel } from '../../models/hr/salary-slip.model';

@Injectable({
  providedIn: 'root'
})
export class SalarySlipService extends ServiceBase<SalarySlipModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "salaryslip", SalarySlipModel, Servers.hrUrl);
  }
}
