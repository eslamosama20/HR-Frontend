import {EntityBase} from '../base/entity-base';
import {DetailAccountModel} from "./detailAccount.model";
import { MainAccountModel } from './mainAccount.model';
import {TransactionModel} from "./transaction.model";

export class TransactionEntryModel extends EntityBase {

  creditAmount : number;
  debitAmount : number;
  description : string;
  mainAccountId : string;
  mainAccount : MainAccountModel;
  transactionId : string;
  transaction : TransactionModel;
  constructor(data?: Partial<TransactionEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.creditAmount
      && !!this.debitAmount
      && !!this.mainAccountId
      && !!this.transactionId
  }

  isValidPreSave(): boolean {
    return super.validate()
      && this.creditAmount !== undefined
      && this.debitAmount !== undefined
      && !!this.mainAccountId
  }
}
