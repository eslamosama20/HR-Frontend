import {EntityBase} from "../base/entity-base";
import {Treasury} from "../treasury/treasury";
import {MainAccountModel} from "../accounting/mainAccount.model";

export class DebitNoteAccountModel extends EntityBase {

  amount: number;
  tax: number = 0;
  description: string;
  debitNoteId: string;
  mainAccountId : string;
  mainAccount : MainAccountModel;

  constructor(data?: Partial<DebitNoteAccountModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.mainAccountId
      && !!this.amount
  }
}
