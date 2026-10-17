import { PurchasableCardReportItemModel } from "./purchasableCardReportItem.model";

export class PurchasableCardReportModel {

  operationDate: Date;
  operationReferenceNumber: string;
  description: string;
  operationSource: string;
  supplierDetailsArabicName: string;
  supplierDetailsEnglishName: string;
  purchasableCardReportItems: PurchasableCardReportItemModel[];

  constructor(data: any) {
    if (
      !data ||
      !data.operationDate ||
      !data.operationReferenceNumber ||
      !data.operationSource ||
      !data.purchasableCardReportItems
    ) {
      return;
    }

    this.operationDate = new Date(data.operationDate);
    this.operationReferenceNumber = data.operationReferenceNumber;
    this.description = data.description;
    this.operationSource = data.operationSource;
    this.supplierDetailsArabicName = data.supplierDetailsArabicName;
    this.supplierDetailsEnglishName = data.supplierDetailsEnglishName;
    this.purchasableCardReportItems = data.purchasableCardReportItems.map(
      (item: any) => new PurchasableCardReportItemModel(item)
    );

  }


}
