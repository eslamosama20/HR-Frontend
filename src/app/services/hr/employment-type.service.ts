import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {EmploymentTypeModel} from "../../models/hr/employment-type.model";

@Injectable({
  providedIn: 'root'
})
export class EmploymentTypeService extends ServiceBase<EmploymentTypeModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "employmentType", EmploymentTypeModel, Servers.hrUrl);
  }
}
