import {PdfItemModel} from "./pdf-item.model";
import {PdfRowGroupModel} from "./pdf-row-group.model";

export class PdfColumnGroupModel {
  // Now each column is an array of rows, each row is an array of items
  rows: PdfRowGroupModel[];

  constructor(data?: Partial<PdfColumnGroupModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
