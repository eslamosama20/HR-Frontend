import {EntityBase} from "../base/entity-base";
import {SalesCreditNoteItemModel} from "./salesCreditNoteItem.model";
import {CustomerProfileModel} from "../accounting/customerProfile.model";
import {AttachmentModel} from "../Attachments/attachment.model";
import {SalesInvoice} from "../salesInvoice/salesInvoice";

export class SalesCreditNoteModel extends EntityBase {

  adjustmentReason : string;
  saleInvoiceId: number;
  saleInvoice: SalesInvoice;
  description: string;
  issueDate!: Date | string;
  dueDate!: Date | string;
  salesCreditNoteNo: string;
  discountAmount!: number;  // Required decimal field
  transactionId?: string;
  customerProfileId: string;
  customerProfile: CustomerProfileModel;
  salesCreditNoteItems: SalesCreditNoteItemModel[];
  isCleared: boolean;
  invoiceHash: string;
  generatedQR: string;
  attachments: AttachmentModel[];
  constructor(data?: Partial<SalesCreditNoteModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.customerProfileId
      && !!this.adjustmentReason
      && !!this.saleInvoiceId
      && !!this.issueDate
      && !!this.dueDate
      && !!this.discountAmount
      && this.salesCreditNoteItems.length > 0

  }
}
