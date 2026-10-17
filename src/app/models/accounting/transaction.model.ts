import {EntityBase} from '../base/entity-base';
import {ClientProfileModel} from "./clientProfile.model";
import {TransactionEntryModel} from "./transactionEntry.model";
import {TransactionTypeModel} from "./transactionType.model";
import {AttachmentModel} from "../Attachments/attachment.model";

export class TransactionModel extends EntityBase {

  referenceNumber: string;
  description: string;
  transactionType : TransactionTypeModel;
  transactionTypeId: string;
  transactionEntries: TransactionEntryModel[];
  transactionDate: Date | string;
  saleInvoiceId?: string;
  purchaseInvoiceId?: string;

  salesReturnId?: string;
  purchaseReturnId?: string;

  paymentReceiptId?:string;
  paycheckReceiptId?:string;

  inventoryPermitId?:string;
  inventoryStocktakingId?:string;

  reservationId?:string;

  debitNoteId?:string;
  creditNoteId?:string;

  attachments: AttachmentModel[];


  isTransactionPost1: boolean = false;

  isFrontal: boolean = false;

  isOpeningTransaction : boolean = false;
  constructor(data?: Partial<TransactionModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.transactionTypeId
      && !!this.transactionDate
  }
}
