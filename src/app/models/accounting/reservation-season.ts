import { EntityBase } from "../base/entity-base";
import { MainAccountModel } from "./mainAccount.model";

export class ReservationSeason extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;

  roomRevenueMainAccountId?: string;
  roomRevenueMainAccount: MainAccountModel;
  roomExpenseMainAccountId?: string;
  roomExpenseMainAccount: MainAccountModel;
  mealRevenueMainAccountId?: string;
  mealRevenueMainAccount: MainAccountModel;
  mealExpenseMainAccountId?: string;
  mealExpenseMainAccount: MainAccountModel;
  otherRevenueMainAccountId?: string;
  otherRevenueMainAccount: MainAccountModel;
  otherExpenseMainAccountId?: string;
  otherExpenseMainAccount: MainAccountModel;

  constructor(data?: Partial<ReservationSeason>) {
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
