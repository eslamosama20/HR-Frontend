import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { DetailSalesClassModel } from 'src/app/models/sales-classes-tree/detailSalesClass.model';

@Injectable({
  providedIn: 'root'
})
export class DetailSalesClassService extends ServiceBase<DetailSalesClassModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "detailSalesClass", DetailSalesClassModel, Servers.accountingUrl);
  }
}
