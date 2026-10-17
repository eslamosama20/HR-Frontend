import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {TransactionEntryModel} from "../../models/accounting/transactionEntry.model";

@Injectable({
  providedIn: 'root'
})
export class TransactionEntryService extends ServiceBase<TransactionEntryModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "transactionEntry", TransactionEntryModel, Servers.accountingUrl);
  }
}
