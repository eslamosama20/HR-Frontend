import {EntityBase} from "../base/entity-base";

export class AttachmentModel  {
  id: string;
  referenceNumber: string;
  fileName: string;
  fileType: string;
  fileData?: string;
  file?: string;
  uploadedAt: Date;

  inventoryPermitId: string;
  purchaseInvoiceId: number;
  saleInvoiceId: number;
  salesReturnId: number;
  purchaseReturnId: number;
  paymentReceiptId: string;
  paycheckReceiptId: string;
  debitNoteId: string;
  creditNoteId: string;
  inventoryStocktakingId: string;
  reservationId: string;
  transactionId: string;

  constructor(data?: Partial<AttachmentModel>) {
    if (data) {
      this.id = data.id;
      this.referenceNumber = data.referenceNumber;
      this.fileName = data.fileName;
      this.fileType = data.fileType;
      this.fileData = data?.fileData;
      this.file = data?.file;
      this.uploadedAt = data?.uploadedAt;
      this.inventoryPermitId = data?.inventoryPermitId;
      this.purchaseInvoiceId = data?.purchaseInvoiceId;
      this.saleInvoiceId = data?.saleInvoiceId;
      this.salesReturnId = data?.salesReturnId;
      this.purchaseReturnId = data?.purchaseReturnId;
      this.paymentReceiptId = data?.paymentReceiptId;
      this.paycheckReceiptId = data?.paycheckReceiptId
      this.debitNoteId = data?.debitNoteId;
      this.creditNoteId = data?.creditNoteId;
      this.inventoryStocktakingId = data?.inventoryStocktakingId;
      this.reservationId = data?.reservationId;
      this.transactionId = data?.transactionId;
    }
  }

}
