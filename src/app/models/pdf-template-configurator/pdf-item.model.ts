export class PdfItemModel {
  id: string;
  type: string;
  fontSize: string;
  align: string;
  label: string = '';

  isBold : boolean = false;
  isItalic : boolean = false;
  isUnderline : boolean = false;
  isStrikethrough : boolean = false;
  constructor(data?: Partial<PdfItemModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
