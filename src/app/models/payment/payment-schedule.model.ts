import { EntityBase } from '../base/entity-base';
import { PaymentMethodType } from './payment.model';

/**
 * Payment Schedule Model
 * Used for creating payment schedules for invoices
 */
export class PaymentScheduleModel extends EntityBase {
  invoiceId: string;
  invoiceType: PaymentScheduleInvoiceType;
  amount: number;
  vat: number;
  paymentDate: string; // ISO 8601 date-time format
  entryNo?: string | null;
  notes?: string | null;
  paymentMethodType: PaymentMethodType;
  referenceNumber?: string | null;
  treasuryId?: string | null;
  paycheckReceiptId?: string | null;
  receiptNo?: string | null;

  constructor(data?: Partial<PaymentScheduleModel>) {
    super(data);
    if (data) {
      this.invoiceId = data.invoiceId || '';
      this.invoiceType = data.invoiceType ?? PaymentScheduleInvoiceType.HotelAllotmentInvoice;
      this.amount = data.amount ?? 0;
      this.vat = data.vat ?? 0;
      this.paymentDate = data.paymentDate || new Date().toISOString();
      this.entryNo = data.entryNo ?? null;
      this.notes = data.notes ?? null;
      this.paymentMethodType = data.paymentMethodType ?? PaymentMethodType.Cash;
      this.referenceNumber = data.referenceNumber ?? null;
      this.treasuryId = data.treasuryId ?? null;
      this.paycheckReceiptId = data.paycheckReceiptId ?? null;
      this.receiptNo = data.receiptNo ?? null;
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.invoiceId
      && !!this.invoiceType
      && !!this.amount
      && !!this.paymentDate
      && !!this.paymentMethodType;
  }

  override toJSON(): any {
    return {
      invoiceId: this.invoiceId,
      invoiceType: this.invoiceType,
      amount: this.amount,
      vat: this.vat,
      paymentDate: this.paymentDate,
      entryNo: this.entryNo,
      notes: this.notes,
      paymentMethodType: this.paymentMethodType,
      referenceNumber: this.referenceNumber,
      treasuryId: this.treasuryId,
      paycheckReceiptId: this.paycheckReceiptId,
      receiptNo: this.receiptNo
    };
  }
}

/**
 * Invoice types for payment schedules
 * Based on backend API specification
 */
export enum PaymentScheduleInvoiceType {
  HotelAllotmentInvoice = 1,
  PurchaseInvoice = 2,
  SaleInvoice = 3,
  Reservation = 4
}

/**
 * Invoice type options for dropdown
 */
export const PAYMENT_SCHEDULE_INVOICE_TYPE_OPTIONS = [
  { value: PaymentScheduleInvoiceType.HotelAllotmentInvoice, labelEn: 'Hotel Allotment Invoice', labelAr: 'فاتورة حجوزات' },
  { value: PaymentScheduleInvoiceType.SaleInvoice, labelEn: 'Sale Invoice', labelAr: 'فاتورة مبيعات' },
  { value: PaymentScheduleInvoiceType.PurchaseInvoice, labelEn: 'Purchase Invoice', labelAr: 'فاتورة مشتريات' },
  { value: PaymentScheduleInvoiceType.Reservation, labelEn: 'Reservation', labelAr: 'حجز' }
];

/**
 * Request interface for creating payment schedule
 */
export interface CreatePaymentScheduleRequest {
  invoiceId: string;
  invoiceType: PaymentScheduleInvoiceType;
  amount: number;
  vat: number;
  paymentDate: string;
  entryNo?: string | null;
  notes?: string | null;
  paymentMethodType: PaymentMethodType;
  referenceNumber?: string | null;
  treasuryId?: string | null;
  paycheckReceiptId?: string | null;
  receiptNo?: string | null;
}

/**
 * Response interface for payment schedule
 */
export interface PaymentScheduleResponse {
  id: string;
  invoiceId: string;
  invoiceType: PaymentScheduleInvoiceType;
  amount: number;
  vat: number;
  paymentDate: string;
  entryNo?: string | null;
  notes?: string | null;
  paymentMethodType: PaymentMethodType;
  referenceNumber?: string | null;
  treasuryId?: string | null;
  paycheckReceiptId?: string | null;
  receiptNo?: string | null;
  createdAt?: string;
  createdBy?: string;
  isActive?: boolean;
}
