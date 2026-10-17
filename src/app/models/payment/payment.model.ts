import { EntityBase } from '../base/entity-base';

// Invoice types for payments
export enum PaymentInvoiceType {
  SalesInvoice = 3,
  MealReservation = 4
}

// Payment method types for sales invoice payments
export enum PaymentMethodType {
  Cash = 1,
  Cheque = 2,
  Credit = 3,
  BankTransfer = 4,
  Deposit = 5
}

// Payment method options for dropdown
export const PAYMENT_METHOD_OPTIONS = [
  { value: PaymentMethodType.Cash, labelEn: 'Cash', labelAr: 'نقدي' },
  { value: PaymentMethodType.Cheque, labelEn: 'Cheque', labelAr: 'شيك' },
  { value: PaymentMethodType.Credit, labelEn: 'Credit', labelAr: 'بطاقة ائتمان' },
  { value: PaymentMethodType.BankTransfer, labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي' },
  // { value: PaymentMethodType.Deposit, labelEn: 'Deposit', labelAr: 'إيداع' }
];

export class PaymentModel extends EntityBase {
  invoiceId: string;
  invoiceType: number;
  amount: number;
  vat: number;
  totalAmount?: number;
  paymentDate: string;
  entryNo?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  paymentMethodType?: PaymentMethodType | null;
  paymentRemaining?: number;
  totalInvoice?: number;
  paycheckReceiptId?: string | null;
  receiptNo?: string | null;

  constructor(data?: Partial<PaymentModel>) {
    super(data);
    if (data) {
      this.invoiceId = data.invoiceId || '';
      this.invoiceType = data.invoiceType ?? 3;
      this.amount = data.amount ?? 0;
      this.vat = data.vat ?? 0;
      this.totalAmount = data.totalAmount ?? (this.amount + this.vat);
      this.paymentDate = data.paymentDate || new Date().toISOString();
      this.entryNo = data.entryNo ?? null;
      this.notes = data.notes ?? null;
      this.referenceNumber = data.referenceNumber ?? null;
      this.paymentMethodType = data.paymentMethodType ?? null;
      this.paymentRemaining = data.paymentRemaining ?? 0;
      this.totalInvoice = data.totalInvoice ?? 0;
      this.paycheckReceiptId = data.paycheckReceiptId ?? null;
      this.receiptNo = data.receiptNo ?? null;
    }
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
      referenceNumber: this.referenceNumber,
      paymentMethodType: this.paymentMethodType
    };
  }
}

export interface CreatePaymentRequest {
  invoiceId: string;
  invoiceType: number;
  amount: number;
  vat?: number;
  paymentDate: string;
  entryNo?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  paymentMethodType?: PaymentMethodType | null;
}

export interface UpdatePaymentRequest {
  id: string;
  invoiceId: string;
  invoiceType: number;
  amount: number;
  vat?: number;
  paymentDate: string;
  entryNo?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  paymentMethodType?: PaymentMethodType | null;
}

export interface PaymentResponse {
  id: string;
  invoiceId: string;
  invoiceType: number;
  amount: number;
  vat: number;
  totalAmount: number;
  paymentDate: string;
  entryNo?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  paymentMethodType?: PaymentMethodType | null;
  paymentRemaining?: number;
  totalInvoice?: number;
  paycheckReceiptId?: string | null;
  receiptNo?: string | null;
}
