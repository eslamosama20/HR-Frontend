export class InventoryReportRecord {
    mainPurchaseClassReferenceCode: string;
    mainPurchaseClassArabicName: string;
    mainPurchaseClassEnglishName: string;
    measurementUnitEnglishName: string;
    measurementUnitArabicName: string;
    beforePeriodQuantity: number;
    lastItemPrice: number;
    beforePeriodTotalPrice: number;
    periodQuantity: number;
    inPeriodAverageItemPrice: number;
    inPeriodTotalPrice: number;
    totalQuantity: number;
    totalPrice: number;

    constructor(data: any) {
      if (
        !data ||
        !data.mainPurchaseClassReferenceCode ||
        !data.mainPurchaseClassArabicName ||
        !data.mainPurchaseClassEnglishName ||
        !data.measurementUnitEnglishName ||
        !data.measurementUnitArabicName
      ) {
        return;
      }
      this.mainPurchaseClassReferenceCode = data.mainPurchaseClassReferenceCode;
      this.mainPurchaseClassArabicName = data.mainPurchaseClassArabicName;
      this.mainPurchaseClassEnglishName = data.mainPurchaseClassEnglishName;
      this.measurementUnitEnglishName = data.measurementUnitEnglishName;
      this.measurementUnitArabicName = data.measurementUnitArabicName;
      this.beforePeriodQuantity = data.beforePeriodQuantity;
      this.lastItemPrice = data.lastItemPrice;
      this.beforePeriodTotalPrice = data.beforePeriodTotalPrice;
      this.periodQuantity = data.periodQuantity;
      this.inPeriodAverageItemPrice = data.inPeriodAverageItemPrice;
      this.inPeriodTotalPrice = data.inPeriodTotalPrice;
      this.totalQuantity = data.totalQuantity;
      this.totalPrice = data.totalPrice;
    }


  }
