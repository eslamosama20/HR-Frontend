export class PdfCustomTextsModel  {
  id: string;
  value: string;
  constructor(data?: Partial<PdfCustomTextsModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
