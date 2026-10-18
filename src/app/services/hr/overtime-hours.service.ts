import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {OvertimeHoursModel} from "../../models/hr/overtime-hours.model";
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OvertimeHoursService extends ServiceBase<OvertimeHoursModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "overtimeHours", OvertimeHoursModel, Servers.hrUrl);
  }

  syncFromFingerprint(): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/sync-from-fingerprint`;
    request.server_url = this.server_url;
    request.body = {};
    return this.apiCaller.callApi(request);
  }
}

