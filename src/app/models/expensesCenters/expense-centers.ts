import { CustomerProfileModel } from "../accounting/customerProfile.model";
import { EntityBase } from "../base/entity-base";

export class ExpenseCenters extends EntityBase {

  englishName: string;
  arabicName: string;

  constructor(data?: Partial<CustomerProfileModel>) {
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
