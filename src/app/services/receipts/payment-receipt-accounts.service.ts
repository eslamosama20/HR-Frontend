import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {PaymentReceiptAccountModel} from "../../models/receipts/paymentReceiptAccount.model";

@Injectable({
  providedIn: 'root'
})
export class PaymentReceiptAccountsService extends ServiceBase<PaymentReceiptAccountModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "paymentReceiptAccount", PaymentReceiptAccountModel,Servers.receipts);
  }
}
