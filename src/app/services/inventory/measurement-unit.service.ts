import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import {MeasurementUnitModel} from "../../models/inventory/measurementUnit.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class MeasurementUnitService extends ServiceBase<MeasurementUnitModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "measurementUnit", MeasurementUnitModel, Servers.inventoryUrl);
  }
}
