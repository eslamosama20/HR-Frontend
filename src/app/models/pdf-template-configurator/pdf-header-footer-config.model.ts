import {EntityBase} from '../base/entity-base';
import {PdfColumnGroupModel} from "./pdf-column-group.model";
import { PdfCustomTextsModel } from './pdf-custom-texts.model';

export class PdfHeaderFooterConfigModel  {
  columns: PdfColumnGroupModel[];
  customTexts: PdfCustomTextsModel[];
  addressSubfields: string[];
  constructor(data?: Partial<PdfHeaderFooterConfigModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
