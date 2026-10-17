import {PdfItemModel} from "./pdf-item.model";

export class PdfRowGroupModel  {
  items: PdfItemModel[];

  constructor(data?: Partial<PdfRowGroupModel>) {
    if (data) {
      Object.assign(this, data);

    }
  }
}
