import {Injectable} from '@angular/core';
import {ServiceBase} from "./base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "./api-caller.service";
import { Servers } from '../enums/servers';
import {SystemSettingModel} from "../models/system-setting.model";
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SystemSettingService extends ServiceBase<SystemSettingModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "systemSetting", SystemSettingModel, Servers.baseApi);
  }

  /**
   * Get current reservation serial configuration
   * GET /api/SystemSetting/current-reservation-serial
   */
  getCurrentReservationSerial(): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/current-reservation-serial`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(response => response?.data ?? response)
    );
  }

  /**
   * Check if any reservations exist in the system
   * This will be used to determine if serial config can be edited
   */
  checkReservationsExist(): Observable<boolean> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = 'reservation/count';
    request.server_url = Servers.baseApi;
    return this.apiCaller.callApi(request).pipe(
      map(response => (response?.data ?? response) > 0)
    );
  }
}
