import {EntityBase} from "../base/entity-base";
import {MealReservationModel} from "./meal-reservation.model";

export class MealReservationEntryModel extends EntityBase {

  arrivalDate: Date | string;
  departureDate: Date | string;
  numberOfNights: number;
  reservationMealId: string;
  reservationMeal: MealReservationModel;
  numberOfPersons: number;
  frees: number;
  mealRate: number;
  mealCost: number;
  guestName: string;
  nationality: string;
  entringMeal?: string;
  exitingMeal?: string;

  mealReservationId: string;

  constructor(data?: Partial<MealReservationEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arrivalDate
      && !!this.departureDate
      && !!this.numberOfNights
      && !!this.reservationMealId
      && !!this.numberOfPersons
      && !!this.mealRate
      && !!this.mealCost
      && !!this.guestName
      && !!this.nationality
      && !!this.entringMeal
      && !!this.exitingMeal
  }
}
