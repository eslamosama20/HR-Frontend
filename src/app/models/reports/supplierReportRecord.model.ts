

export class SupplierReportRecord {
  mainPurchaseClassArabicName: string;
  mainPurchaseClassEnglishName: string;
  quantity: number;

  constructor(data: any) {
    if(
      !data.mainPurchaseClassEnglishName ||
      !data.mainPurchaseClassArabicName ||
      !data.quantity
    ){
      throw new Error('SupplierReportRecord data is not valid');
    }
    this.mainPurchaseClassEnglishName = data.mainPurchaseClassEnglishName;
    this.mainPurchaseClassArabicName = data.mainPurchaseClassArabicName;
    this.quantity = data.quantity;
  }
}
