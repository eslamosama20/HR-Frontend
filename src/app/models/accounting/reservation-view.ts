import { EntityBase } from "../base/entity-base";

export class ReservationView extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;
  salesClassId?: string;

  reservationNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  linkedReceiptId?: string;

  constructor(data?: Partial<ReservationView>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
  }
}
