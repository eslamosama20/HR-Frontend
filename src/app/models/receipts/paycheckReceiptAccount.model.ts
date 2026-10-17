import {EntityBase} from "../base/entity-base";
import {Treasury} from "../treasury/treasury";
import {MainAccountModel} from "../accounting/mainAccount.model";

export class PaycheckReceiptAccountModel extends EntityBase {

  amount: number;
  tax: number = 0;
  description: string;
  paycheckReceiptId: string;
  mainAccountId : string;
  mainAccount : MainAccountModel;

  constructor(data?: Partial<PaycheckReceiptAccountModel>) {
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
