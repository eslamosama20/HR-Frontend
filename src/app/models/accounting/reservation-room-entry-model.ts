import { EntityBase } from "../base/entity-base";

export class ReservationRoomEntryModel extends EntityBase {
  roomTypeId: string;
  numberOfRooms: number;
  roomRate: number;
  roomCost: number;
  reservationMealId: string;
  mealRate: number;
  mealCost: number;
  reservationViewId: string;
  viewRate: number;
  viewCost: number;
  reservationId: string;

  roomTypeArabicName?: string;
  roomTypeEnglishName?: string;
  reservationMealArabicName?: string;
  reservationMealEnglishName?: string;
  reservationViewArabicName?: string;
  reservationViewEnglishName?: string;
  constructor(data?: Partial<ReservationRoomEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.roomTypeId
      && !!this.numberOfRooms
      && !!this.roomRate
      && !!this.roomCost


  }
}
