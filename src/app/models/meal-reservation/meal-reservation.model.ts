import { EntityBase } from "../base/entity-base";
import { CustomerProfileModel } from "../accounting/customerProfile.model";
import { MealReservationEntryModel } from "./meal-reservation-entry.model";

export class MealReservationModel extends EntityBase {
  referenceNumber: string;
  customerProfileId: string;
  customerProfile: CustomerProfileModel;
  transactionId?: string;

  // 🟢 الحقول الجديدة حسب الـ API
  description?: string;
  customerReservationNumber?: string;
  notes?: string;

  mealReservationEntries: MealReservationEntryModel[];

  constructor(data?: Partial<MealReservationModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.customerProfileId;
  }
}
