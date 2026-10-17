export class PurchasableCardReportItemModel {
  storeDetailsArabicName: string;
  storeDetailsEnglishName: string;
  unitMeasurementName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;

  constructor(data: any) {
    if (
      !data ||
      !data.quantity ||
      !data.unitPrice ||
      !data.totalPrice
    ) {
      return;
    }
    this.storeDetailsArabicName = data.storeDetailsArabicName;
    this.storeDetailsEnglishName = data.storeDetailsEnglishName;
    this.unitMeasurementName = data.unitMeasurementName;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
    this.totalPrice = data.totalPrice;
  }
}
