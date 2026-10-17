import { Item } from "./item";

export interface Invoice {
  id?: number;
  invoiceNo?: string;
  invoiceType: number;
  name?: string;
  currency?: string;
  clientName?: string;
  description?: string;
  issueDate?: string;
  dueDate?: string;
  tax?: number;
  taxAmount?: number;
  discount?: number;
  discountAmount?: number;
  totalPrice?: number;
  netPrice?: number;
  items?: Item[];

  isFrontal?: boolean;
  isCleared?: boolean;
  invoiceHash?: string;
  generatedQR?: string;
}
