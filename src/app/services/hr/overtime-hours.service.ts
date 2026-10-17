import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {OvertimeHoursModel} from "../../models/hr/overtime-hours.model";

@Injectable({
  providedIn: 'root'
})
export class OvertimeHoursService extends ServiceBase<OvertimeHoursModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "overtimeHours", OvertimeHoursModel, Servers.hrUrl);
  }
}
