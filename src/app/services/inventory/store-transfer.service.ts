import { Injectable } from '@angular/core';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { StoreTransferModel } from '../../models/inventory/storeTransfer.model';

@Injectable({
  providedIn: 'root'
})
export class StoreTransferService extends ServiceBase<StoreTransferModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, 'storeTransfer', StoreTransferModel, Servers.inventoryUrl);
  }
}
