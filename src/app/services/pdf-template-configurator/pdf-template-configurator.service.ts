import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {PdfTemplateConfiguratorModel} from "../../models/pdf-template-configurator/pdf-template-configurator.model";

@Injectable({
  providedIn: 'root'
})
export class PdfTemplateConfiguratorService extends ServiceBase<PdfTemplateConfiguratorModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "pdfTemplateConfiguration", PdfTemplateConfiguratorModel, Servers.baseApi);
  }
}
