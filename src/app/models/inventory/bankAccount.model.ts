import { EntityBase } from '../base/entity-base';

export class BankAccountModel extends EntityBase {
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  bankBranchName: string;
  swiftCode: string;
  iban: string;
  isPrimary: boolean;

  constructor(data?: Partial<BankAccountModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.bankName
      && !!this.bankAccountNumber;
  }
}
