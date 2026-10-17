import { Injectable } from '@angular/core';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { ResignationRequestModel } from '../../models/hr/resignation-request.model';

@Injectable({
  providedIn: 'root'
})
export class ResignationRequestService extends ServiceBase<ResignationRequestModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "resignationrequest", ResignationRequestModel, Servers.hrUrl);
  }
}
