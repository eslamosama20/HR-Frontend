import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {PenaltyModel} from "../../models/hr/penalty.model";

@Injectable({
  providedIn: 'root'
})
export class PenaltyService extends ServiceBase<PenaltyModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "penalty", PenaltyModel, Servers.hrUrl);
  }
}
