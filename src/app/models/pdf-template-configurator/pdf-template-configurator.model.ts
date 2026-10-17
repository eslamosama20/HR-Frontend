import {EntityBase} from '../base/entity-base';
import {PdfHeaderFooterConfigModel} from "./pdf-header-footer-config.model";

export class PdfTemplateConfiguratorModel extends EntityBase {

  header: PdfHeaderFooterConfigModel;
  footer: PdfHeaderFooterConfigModel;
  constructor(data?: Partial<PdfTemplateConfiguratorModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }
}
