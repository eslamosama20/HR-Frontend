import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {EmployeeModel} from "../../models/hr/employee.model";

@Injectable({
  providedIn: 'root'
})
export class EmployeeService extends ServiceBase<EmployeeModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "employee", EmployeeModel, Servers.hrUrl);
  }
}
