import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {ShiftModel} from "../../models/hr/shift.model";

@Injectable({
  providedIn: 'root'
})
export class ShiftService extends ServiceBase<ShiftModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "shift", ShiftModel, Servers.hrUrl);
  }
}
