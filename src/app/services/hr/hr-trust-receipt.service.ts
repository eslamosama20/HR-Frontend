import { Injectable } from '@angular/core';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { HRTrustReceiptModel } from '../../models/hr/hr-trust-receipt.model';

@Injectable({
  providedIn: 'root'
})
export class HRTrustReceiptService extends ServiceBase<HRTrustReceiptModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "hrtrustreceipt", HRTrustReceiptModel, Servers.hrUrl);
  }
}
