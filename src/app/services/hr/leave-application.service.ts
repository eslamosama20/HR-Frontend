import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { LeaveApplicationModel } from '../../models/hr/leave-application.model';

@Injectable({
  providedIn: 'root'
})
export class LeaveApplicationService extends ServiceBase<LeaveApplicationModel> {
  constructor(private apiCallerService: ApiCallerService) {
    super(apiCallerService, "leaveapplication", LeaveApplicationModel, Servers.hrUrl);
  }

  getPending(): Observable<LeaveApplicationModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/pending`;
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<LeaveApplicationModel>) => new LeaveApplicationModel(item)))
    );
  }

  getByEmployee(employeeId: string): Observable<LeaveApplicationModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/employee/${employeeId}`;
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<LeaveApplicationModel>) => new LeaveApplicationModel(item)))
    );
  }

  approve(id: string, approverId: string): Observable<LeaveApplicationModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${id}/approve`;
    request.body = { approverId };
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => new LeaveApplicationModel(data))
    );
  }

  reject(id: string, approverId: string, rejectionReason?: string): Observable<LeaveApplicationModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${id}/reject`;
    request.body = { approverId, rejectionReason };
    request.server_url = Servers.hrUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => new LeaveApplicationModel(data))
    );
  }
}
