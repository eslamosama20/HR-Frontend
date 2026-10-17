import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { InsuranceRecordModel } from '../../models/hr/insurance-record.model';

@Injectable({
  providedIn: 'root'
})
export class InsuranceRecordService extends ServiceBase<InsuranceRecordModel> {
  constructor(private apiCallerService: ApiCallerService) {
    super(apiCallerService, "insurancerecord", InsuranceRecordModel, Servers.hrUrl);
  }

  getExpiring(days: number = 30): Observable<InsuranceRecordModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/expiring?days=${days}`;
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<InsuranceRecordModel>) => new InsuranceRecordModel(item)))
    );
  }
}
