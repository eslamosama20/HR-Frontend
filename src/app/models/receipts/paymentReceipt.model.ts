import {EntityBase} from "../base/entity-base";
import {Treasury} from "../treasury/treasury";
import {PaymentReceiptAccountModel} from "./paymentReceiptAccount.model";
import {AttachmentModel} from "../Attachments/attachment.model";
import {ReceiptConnectionModel} from "./receiptConnection.model";
import {PaymentMethodType} from "../payment/payment.model";

export class PaymentReceiptModel extends EntityBase {

  referenceNumber: string;
  description: string;
  amount: number;
  tax: number = 0;
  treasuryId: string;
  treasury: Treasury;
  receiptDate: Date | string;
  paymentReceiptAccounts: PaymentReceiptAccountModel[];
  transactionId: string;
  paymentMethodType?: PaymentMethodType;

  checkNumber?: string;
  bankName?: string;
  bankReferenceNumber?: string;
  voucherNumber?: string;
  transactionNumber?: string;

  attachments: AttachmentModel[];
  isFrontal: boolean = false;
  receiptConnections: ReceiptConnectionModel[] = [];

  constructor(data?: Partial<PaymentReceiptModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.treasuryId
      && !!this.receiptDate
      && !!this.amount
  }
}
