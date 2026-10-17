import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {AttendanceModel} from "../../models/hr/attendance.model";

@Injectable({
  providedIn: 'root'
})
export class AttendanceService extends ServiceBase<AttendanceModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "attendance", AttendanceModel, Servers.hrUrl);
  }
}
