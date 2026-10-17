import { EntityBase } from '../base/entity-base';

export class DocumentTemplateModel extends EntityBase {
  name: string;
  code?: string;
  templateType: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;

  constructor(data?: Partial<DocumentTemplateModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.name
      && !!this.templateType;
  }
}
