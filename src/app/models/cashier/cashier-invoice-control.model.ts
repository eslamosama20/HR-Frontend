export type CashierInvoiceStatus =
  | 'paid'
  | 'completed'
  | 'pending'
  | 'cancelled'
  | 'voided'
  | 'refunded'
  | 'partial_refund';

export type CashierInvoicePaymentType = 'cash' | 'card' | 'mixed' | 'credit' | string;

export interface CashierInvoiceItemDto {
  id?: number | string;
  saleItemId?: number | string;
  itemId?: number | string | null;
  itemCode?: string | null;
  itemName?: string | null;
  name?: string | null;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
}

export interface CashierInvoiceDto {
  id: number | string;
  invoiceNo: string;
  shiftInvoiceNo?: number | null;
  invoiceDate: string;
  sessionId?: number | string | null;
  sessionNo?: string | null;
  cashierName?: string | null;
  customerName?: string | null;
  stationName?: string | null;
  paymentType?: CashierInvoicePaymentType | null;
  paymentMethod?: CashierInvoicePaymentType | null;
  invoiceStatus?: CashierInvoiceStatus | string | null;
  status?: CashierInvoiceStatus | string | null;
  subtotal?: number;
  discount?: number;
  discountAmount?: number;
  tax?: number;
  taxAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  refundedAmount?: number;
  canCancel?: boolean;
  canVoid?: boolean;
  canRefund?: boolean;
  canReprint?: boolean;
  items?: CashierInvoiceItemDto[];
  refunds?: unknown[];
  auditHistory?: unknown[];
}

export interface CashierInvoiceStatsDto {
  totalInvoices?: number;
  totalAmount?: number;
  totalPaid?: number;
  totalCash?: number;
  totalCard?: number;
  totalCredit?: number;
  totalRefunded?: number;
  cancelledCount?: number;
  voidedCount?: number;
  netRevenue?: number;
}

export interface CashierInvoicePaymentDto {
  id?: number | string;
  invoiceId?: number | string;
  paymentNo?: string | null;
  paymentMethod?: CashierInvoicePaymentType | number | null;
  paymentType?: CashierInvoicePaymentType | number | null;
  status?: string | null;
  amount?: number;
  paidAmount?: number;
  cashAmount?: number;
  cardAmount?: number;
  creditAmount?: number;
  provider?: string | null;
  providerReference?: string | null;
  transactionId?: string | null;
  createdAt?: string | null;
  paymentDate?: string | null;
  [key: string]: unknown;
}

export interface InvoiceActionReasonDto {
  code: string;
  label: string;
  labelEn?: string;
}

export interface CashierInvoiceListFilters {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  storeDetailsId?: string;
  sessionId?: number | string;
  status?: string;
  paymentMethod?: string;
  keyword?: string;
}

export interface CashierInvoiceActionRequest {
  reason?: string;
  reasonCode?: string;
  notes?: string;
}

export interface CashierInvoiceRefundItemRequest {
  saleItemId?: number | string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface CashierInvoiceRefundRequest {
  customerName?: string;
  reason: string;
  reasonText?: string;
  refundMethod?: string;
  notes?: string;
  items: CashierInvoiceRefundItemRequest[];
}
