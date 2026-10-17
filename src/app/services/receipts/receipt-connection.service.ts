import { Injectable } from '@angular/core';
import { ServiceBase } from "../base/service-base.service";
import { ApiCallerService } from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { ReceiptConnectionModel } from "../../models/receipts/receiptConnection.model";

@Injectable({
  providedIn: 'root'
})
export class ReceiptConnectionService extends ServiceBase<ReceiptConnectionModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "receiptConnection", ReceiptConnectionModel, Servers.receipts);
  }
}