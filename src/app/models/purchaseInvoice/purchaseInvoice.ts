import { SupplierDetailsModel } from "../inventory/supplierDetails.model";
import { PurchaseItem } from "./purchaseItem";
import {AttachmentModel} from "../Attachments/attachment.model";

export class PurchaseInvoice {
  id?: number;
  invoiceNo!: string;
  currency?: string;
  supplierDetailsId?: string;
  supplierDetails?: SupplierDetailsModel;
  description?: string;
  issueDate!: Date;
  dueDate!: Date;
  tax!: number;
  taxAmount!: number;
  discount!: number;
  discountAmount!: number;
  totalPrice!: number;
  netPrice!: number;
  transactionId?: string;
  purchaseItems!: PurchaseItem[];
  attachments: AttachmentModel[];
  isFrontal: boolean;
  purchaseQuotationId?: number; // ID of the quotation this invoice was created from
  originalQuotationNo?: string; // Invoice number of the original quotation

}
