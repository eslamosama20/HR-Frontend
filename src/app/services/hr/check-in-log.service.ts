import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {CheckInLogModel} from "../../models/hr/check-in-log.model";

@Injectable({
  providedIn: 'root'
})
export class CheckInLogService extends ServiceBase<CheckInLogModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "checkInLog", CheckInLogModel, Servers.hrUrl);
  }
}
