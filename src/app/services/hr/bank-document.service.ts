import { Injectable } from '@angular/core';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { BankDocumentModel } from '../../models/hr/bank-document.model';

@Injectable({
  providedIn: 'root'
})
export class BankDocumentService extends ServiceBase<BankDocumentModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "bankdocument", BankDocumentModel, Servers.hrUrl);
  }
}
