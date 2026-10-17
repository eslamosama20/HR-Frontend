import { SalesItem } from "./salesItem";
import {CustomerProfileModel} from "../accounting/customerProfile.model";
import {AttachmentModel} from "../Attachments/attachment.model";
import { InvoicePaymentStatus } from "../invoicePaymentStatus";

export class SalesInvoice {
  id?: number;
  invoiceNo!: string;
  currency: string = 'SAR';
  customerProfileId!: string;
  customerProfileName?: string;
  customerProfile?: CustomerProfileModel;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  issueDate!: Date;
  dueDate!: Date;
  tax!: number;
  taxAmount!: number;
  discount!: number;  // Required decimal field
  discountAmount!: number;  // Required decimal field
  storeDetailsId?: string | null;
  totalPrice!: number;  // Required decimal field
  netPrice!: number;  // Required decimal field
  transactionId?: string;
  saleItems!: SalesItem[];
  isQuotation?: boolean = false;
  convertedToInvoiceId?: number;
  originalQuotationNo?: string; // For invoices: the quotation number it was created from
  attachments: AttachmentModel[];
  isFrontal?: boolean = false;
  reservationId?: string;
  reservationIds?: string[];  
  hasReservationId?: boolean;  
  invoiceType?: 'sale' | 'reservation';  // Invoice type: sale or reservation (frontend only)
  saleInvoiceType?: number;  // Backend invoice type: 0 = sale, 1 = reservation

  isCleared: boolean = false;

  /** ZATCA status (optional until backend is fully integrated) */
  isSentToZatca?: boolean;

  invoiceHash: string;
  generatedQR: string;

  refundStatus?: 'none' | 'partial_refund' | 'refunded';
  refundedAmount?: number;
  projectId?: string;
  customerDepartmentId?: string;
  paymentStatus?: InvoicePaymentStatus;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: number;
  createdBy?: string;
  cashierName?: string;
  sellerName?: string;
}
