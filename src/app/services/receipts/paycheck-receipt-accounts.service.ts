import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {PaycheckReceiptAccountModel} from "../../models/receipts/paycheckReceiptAccount.model";

@Injectable({
  providedIn: 'root'
})
export class PaycheckReceiptAccountsService extends ServiceBase<PaycheckReceiptAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "paycheckReceiptAccount", PaycheckReceiptAccountModel,Servers.receipts);
  }
}
