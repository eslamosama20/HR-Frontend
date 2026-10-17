import { EntityBase } from '../base/entity-base';

export class CompanyPhoneModel extends EntityBase {
  phoneNumber: string;
  isPrimary: boolean;

  constructor(data?: Partial<CompanyPhoneModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.phoneNumber;
  }
}
