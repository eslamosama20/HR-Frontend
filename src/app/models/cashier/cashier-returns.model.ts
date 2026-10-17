import { PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';

export type CashierRefundReason =
  | 'defective'
  | 'wrong_item'
  | 'customer_changed_mind'
  | 'expired'
  | 'damaged'
  | 'other';

export type CashierRefundStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export type CashierRefundMethod = 'cash' | 'card' | 'credit_note' | 'original_method';

export interface CashierReturnInvoiceLine {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  itemBarcode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  unitName: string;
  maxReturnQty: number;
  returnQty: number;
  selected: boolean;
}

export interface CashierReturnInvoiceDetail {
  id: number;
  invoiceNo: string;
  invoiceDate: Date;
  customerName: string;
  customerPhone: string;
  cashierName: string;
  paymentMethod: PaymentMethod;
  items: CashierReturnInvoiceLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
}

export interface CashierReturnHistoryRecord {
  id: number;
  refundNo: string;
  refundDate: Date;
  originalInvoiceNo: string;
  customerName: string;
  reason: CashierRefundReason;
  reasonText: string;
  refundMethod: CashierRefundMethod;
  status: CashierRefundStatus;
  itemsCount: number;
  refundSubtotal: number;
  refundTaxAmount: number;
  refundTotalAmount: number;
  cashierName: string;
  notes: string;
}
