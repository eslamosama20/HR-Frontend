import { EntityBase } from "../base/entity-base";

export class ReservationServiceEntryModel extends EntityBase {

  reservationServiceId: string;
  description: string;
  //startDate: Date | string;
  //endDate: Date | string;
  quantity: number;
  salesPrice: number;
  costPrice: number;
  reservationSupplierId: string;
  reservationId: string;

  reservationServiceArabicName?: string;
  reservationServiceEnglishName?: string;
  reservationSupplierArabicName?: string;
  reservationSupplierEnglishName?: string;
  constructor(data?: Partial<ReservationServiceEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.reservationServiceId
      && !!this.quantity
      && !!this.salesPrice
      && !!this.costPrice
      && !!this.reservationSupplierId
  }
}
