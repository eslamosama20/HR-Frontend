import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {DebitNoteModel} from "../../models/notes/debitNote.model";

@Injectable({
  providedIn: 'root'
})
export class DebitNotesService extends ServiceBase<DebitNoteModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "debitNote", DebitNoteModel,Servers.notes);
  }
}
