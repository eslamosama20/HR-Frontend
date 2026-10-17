import { EntityBase } from "../base/entity-base";
import {MainAccountModel} from "./mainAccount.model";

export class ReservationCompany extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;

  mainAccountId?: string;
  mainAccount: MainAccountModel;
  detailAccountId?: string;
  contactNumber?: string;
email?: string;
bankName?: string;
bankAccountNumber?: string;
iban?: string;
taxNumber?: string;
otherId?: string;
  constructor(data?: Partial<ReservationCompany>) {
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
