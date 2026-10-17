import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {SalesCreditNoteItemModel} from "../../models/notes/salesCreditNoteItem.model";

@Injectable({
  providedIn: 'root'
})
export class CreditNoteAccountsService extends ServiceBase<SalesCreditNoteItemModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "creditNoteAccount", SalesCreditNoteItemModel,Servers.notes);
  }
}
