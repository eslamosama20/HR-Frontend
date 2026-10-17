import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {FingerprintDeviceSettingsModel} from "../../models/hr/fingerprint-device-settings.model";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class FingerprintDeviceSettingsService extends ServiceBase<FingerprintDeviceSettingsModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "fingerprintDeviceSettings", FingerprintDeviceSettingsModel, Servers.hrUrl);
  }

  checkConnectionForFactory1Device(ip?: string, port?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    let ep = `${this.endpoint}/checkConnectionForFactory1Device`;
    if (ip && port) {
      ep += `?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`;
    }
    request.endpoint = ep;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }
  checkConnectionForFactory2Device(ip?: string, port?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    let ep = `${this.endpoint}/checkConnectionForFactory2Device`;
    if (ip && port) {
      ep += `?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`;
    }
    request.endpoint = ep;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }
  checkConnectionForFactory3Device(ip?: string, port?: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    let ep = `${this.endpoint}/checkConnectionForFactory3Device`;
    if (ip && port) {
      ep += `?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`;
    }
    request.endpoint = ep;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  rescheduleJobs(): Observable<boolean> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/reschedule-jobs`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => !!data)
    );
  }

  clearData(factory: "Factory1" | "Factory2" | "Factory3"): Observable<boolean> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/clear-data/${factory}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => !!data)
    );
  }

  syncNow(factory: "Factory1" | "Factory2" | "Factory3"): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/sync-now/${factory}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }
}
