import { EntityBase } from "../base/entity-base";
import { Treasury } from "../treasury/treasury";
import { PaycheckReceiptAccountModel } from "./paycheckReceiptAccount.model";
import { AttachmentModel } from "../Attachments/attachment.model";

import { DistributionType } from "../../enums/distribution-type";

export class PaycheckReceiptModel extends EntityBase {

  referenceNumber: string;
  description: string;
  amount: number;
  tax: number = 0;
  treasuryId: string;
  treasury: Treasury;
  receiptDate: Date | string;
  transactionId: string;
  paycheckReceiptAccounts: PaycheckReceiptAccountModel[];

  attachments: AttachmentModel[];
  isFrontal: boolean = false;

  paymentMethodType?: any;

  checkNumber?: string;
  bankName?: string;
  bankReferenceNumber?: string;
  voucherNumber?: string;
  transactionNumber?: string;



  // paymentMethodType?: number;


  linkedOperationsIds?: string[]; // معرفات العمليات المرتبطة بالسند (فواتير/حجوزات)
  connectedSalesInvoiceId?: number; // معرف الفاتورة المرتبطة بالسند
  receiptConnections?: any[]; // Receipt connections for linking to invoices

  // New properties for amount calculations
  totalPaidAmount?: number; // إجمالي المبلغ المدفوع للفاتورة
  remainingAmount?: number; // المبلغ المتبقي للفاتورة

  constructor(data?: Partial<PaycheckReceiptModel>) {
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
