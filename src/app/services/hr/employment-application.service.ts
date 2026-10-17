import { Injectable } from '@angular/core';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { EmploymentApplicationModel } from '../../models/hr/employment-application.model';

@Injectable({
  providedIn: 'root'
})
export class EmploymentApplicationService extends ServiceBase<EmploymentApplicationModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "employmentapplication", EmploymentApplicationModel, Servers.hrUrl);
  }
}
