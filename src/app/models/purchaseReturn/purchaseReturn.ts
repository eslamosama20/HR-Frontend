import { SupplierDetailsModel } from "../inventory/supplierDetails.model";
import {PurchaseReturnItem} from "./purchaseReturnItem";
import {AttachmentModel} from "../Attachments/attachment.model";

export class PurchaseReturn {
  id?: number;
  returnNo!: string;
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
  purchaseInvoiceId?: string;
  purchaseReturnItems!: PurchaseReturnItem[];
  attachments: AttachmentModel[];

}
