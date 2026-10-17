import { EntityBase } from '../base/entity-base';

export enum ReceiptConnectionType {
  SalesInvoice = 1,
  PurchaseInvoice = 2,
  Reservation = 3,
  Project = 4
}

export class ReceiptConnectionModel extends EntityBase {
  paycheckReceiptId?: string;
  paymentReceiptId?: string;
  saleInvoiceId?: number;
  purchaseInvoiceId?: number;
  reservationId?: string;
  projectId?: string;
  invoiceReference?: string;
  operationType?: string;
  linkedAmount: number;
  receiptConnectionType: ReceiptConnectionType;

  constructor(data?: Partial<ReceiptConnectionModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.linkedAmount
      && this.linkedAmount > 0
      && (!!this.saleInvoiceId || !!this.purchaseInvoiceId || !!this.reservationId || !!this.projectId);
  }
}