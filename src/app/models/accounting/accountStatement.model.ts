import { AccountStatementRecordModel } from "./accountStatementRecord.model";

export class AccountStatementModel {

  previousDebit: number = 0;
  previousCredit: number = 0;
  accountStatementRecords: AccountStatementRecordModel[];

  constructor(data?: Partial<AccountStatementModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
