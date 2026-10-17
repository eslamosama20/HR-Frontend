import { SalesReturnItem } from "./salesReturnItem";
import {CustomerProfileModel} from "../accounting/customerProfile.model";
import {AttachmentModel} from "../Attachments/attachment.model";

export class SalesReturn {
  id?: number;
  returnNo!: string;
  currency?: string;
  customerProfileId!: string;
  customerProfile?: CustomerProfileModel;
  description?: string;
  issueDate!: Date;
  dueDate!: Date;
  tax!: number;
  taxAmount!: number;
  discount!: number;  // Required decimal field
  discountAmount!: number;  // Required decimal field
  totalPrice!: number;  // Required decimal field
  netPrice!: number;  // Required decimal field
  transactionId?: string;
  salesInvoiceId?: string;
  salesReturnItems!: SalesReturnItem[];
  attachments: AttachmentModel[];

  }
