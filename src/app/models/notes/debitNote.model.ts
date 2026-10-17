import {EntityBase} from "../base/entity-base";
import {SupplierDetailsModel} from "../inventory/supplierDetails.model";
import {DebitNoteAccountModel} from "./debitNoteAccount.model";
import {AttachmentModel} from "../Attachments/attachment.model";

export class DebitNoteModel extends EntityBase {

  referenceNumber: string;
  description: string;
  amount: number;
  tax: number = 0;
  supplierDetailsId: string;
  supplierDetails: SupplierDetailsModel;
  receiptDate:Date | string;
  transactionId:string;
  debitNoteAccounts: DebitNoteAccountModel[];

  attachments: AttachmentModel[];

  constructor(data?: Partial<DebitNoteModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.supplierDetailsId
      && !!this.receiptDate
      && !!this.amount
  }
}
