import { EntityBase } from "../base/entity-base";
import { MainAccountModel } from "./mainAccount.model";

export class ReservationServiceModel extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;
  salesClassId?: string;
  logoUrl?: string;
  logoPublicId?: string;

  revenueMainAccountId?: string;
  revenueDetailAccountId?: string;
  revenueMainAccount: MainAccountModel;
  expenseMainAccountId?: string;
  expenseDetailAccountId?: string;
  expenseMainAccount: MainAccountModel;
  contactNumber?: string;
  email?: string;
  bankName?: string;
  bankAccountNumber?: string;
  iban?: string;
  taxNumber?: string;
  constructor(data?: Partial<ReservationServiceModel>) {
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
