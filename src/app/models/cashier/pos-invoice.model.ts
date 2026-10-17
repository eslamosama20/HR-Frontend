/**
 * POS Invoice Model - فاتورة نقطة بيع
 */
export interface POSInvoice {
  id?: number;
  invoiceNo?: string;
  invoiceDate: Date;
  cashierSessionId?: number;
  storeDetailsId?: string;
  cashierUserId?: number;
  cashierUserName?: string;

  // Customer Info
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerType?: CustomerType;

  // Invoice Items
  items: POSInvoiceItem[];

  // Financial Details
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;

  // Payment Details
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  creditDays?: number;
  paymentStatus?: PaymentStatus;

  // Additional Info
  notes?: string;
  status: POSInvoiceStatus;
  isRefunded?: boolean;
  refundedInvoiceId?: number;
  treasuryId?: number;
  branchId?: number;

  // Held Order feature
  isHeld?: boolean;
  heldAt?: Date;
  heldName?: string;

  createdBy?: string;
  createdDate?: Date;
  modifiedBy?: string;
  modifiedDate?: Date;
}

export type PrescriptionAllocationStatusUi = 'pending' | 'allocated' | 'ready' | 'picked';

/** NPHIES / pickup metadata carried in POS cart until backend invoice API accepts extension fields */
export interface CartPrescriptionMetadata {
  pickupId?: string;
  prescriptionId: string;
  prescriptionItemId?: string;
  catalogItemId?: string;
  prescriptionNo?: string;
  batchNo?: string | null;
  expiryDate?: string | null;
  allocationStatus?: PrescriptionAllocationStatusUi;
  patientShare?: number | null;
  insuranceShare?: number | null;
}

export interface POSInvoiceItem {
  id?: number;
  posInvoiceId?: number;
  itemId: number;
  itemCode?: string;
  itemName: string;
  itemNameAr?: string;
  itemBarcode?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  unitId?: number;
  unitName?: string;
  notes?: string;
  /** Optional pharmacy / NPHIES context (not sent on invoice until API supports it) */
  prescriptionMeta?: CartPrescriptionMetadata;

  // Additional Item Info
  categoryId?: number;
  categoryName?: string;
  availableQuantity?: number;
  batchNo?: string;
  expiryDate?: Date | string;

  // Modifiers feature
  modifiers?: POSItemModifier[];
  modifiersTotal?: number;
}

export interface POSItemModifier {
  id?: number;
  name: string;
  price: number;
}

export enum PaymentMethod {
  Cash = 0,
  Card = 1,
  Credit = 2,
  Mixed = 3,
  BankTransfer = 4
}

export enum PaymentStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
  Refunded = 3
}

export enum POSInvoiceStatus {
  Draft = 0,
  Completed = 1,
  Cancelled = 2,
  Refunded = 3,
  PartiallyRefunded = 4
}

export enum CustomerType {
  WalkIn = 0,
  Regular = 1,
  VIP = 2
}

/**
 * Shopping Cart Item - عنصر في العربة
 */
export interface CartItem extends POSInvoiceItem {
  // Additional cart-specific properties
  image?: string;
  isAvailable?: boolean;
  maxQuantity?: number;

  // State for UI
  showModifiers?: boolean;
}

/**
 * Payment Request
 */
export interface PaymentRequest {
  invoiceId?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  creditDays?: number;
  pharmacyPrescriptionId?: string;
  wasafatyPrescriptionId?: string;
  notes?: string;
}

/**
 * Payment Response
 */
export interface PaymentResponse {
  success: boolean;
  invoiceId: number;
  invoiceNo: string;
  paidAmount: number;
  changeAmount: number;
  message?: string;
  receiptUrl?: string;
}
