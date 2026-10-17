import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { TransactionTypeModel } from 'src/app/models/accounting/transactionType.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionTypeService extends ServiceBase<TransactionTypeModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "transactionType", TransactionTypeModel, Servers.accountingUrl);
  }
}
