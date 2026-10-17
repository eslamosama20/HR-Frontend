import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {BonusModel} from "../../models/hr/bonus.model";

@Injectable({
  providedIn: 'root'
})
export class BonusService extends ServiceBase<BonusModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "bonus", BonusModel, Servers.hrUrl);
  }
}
