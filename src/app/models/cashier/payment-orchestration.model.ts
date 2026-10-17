/**
 * Payment Orchestration Models
 * ============================
 * Shared DTOs for the electronic payment gateway engine.
 * Used by: Quick Sale, Pharmacy Checkout, Insurance Co-Pay, Future Flows.
 *
 * Backend Contract:
 *   GET  /api/payments/methods?country=SA  → PaymentMethodDto[]
 *   POST /api/payments                     → CreatePaymentResponse
 */

// ---------------------------------------------------------------------------
// GET /api/payments/methods
// ---------------------------------------------------------------------------

/** One entry returned by GET /api/payments/methods?country=SA */
export interface PaymentMethodDto {
  key: string;      // e.g. "card" | "mada" | "apple_pay" | "tabby" | "tamara" | "stc_pay"
  label: string;    // e.g. "Mada" | "Apple Pay"
  provider: string; // e.g. "paymob" | "tabby" | "tamara" | "hyperpay"
}

// ---------------------------------------------------------------------------
// POST /api/payments
// ---------------------------------------------------------------------------

/** Payload sent to POST /api/payments */
export interface CreatePaymentRequest {
  orderReference: string;
  amount: number;
  currency: string;         // Always "SAR" for Saudi Market
  paymentMethod: string;    // key from PaymentMethodDto
  customerName: string;
  customerEmail: string;    // fallback: "noemail@guest.com"
  customerPhone: string;    // fallback: "+966000000000"
  description: string;
  callbackUrl: string;
}

/** Response from POST /api/payments */
export interface CreatePaymentResponse {
  paymentUrl: string;    // URL to open in new tab for customer to complete payment
  externalId: string;    // Payment provider's transaction ID
  provider: string;      // e.g. "paymob"
  status: string;        // e.g. "Pending"
  internalId: string;    // Internal GUID — used later for GET /api/payments/{internalId}
}

// ---------------------------------------------------------------------------
// Internal UI State
// ---------------------------------------------------------------------------

/** Tracks the electronic payment pending state in the checkout UI */
export interface ElectronicPaymentPendingState {
  internalId: string;
  paymentUrl: string;
  provider: string;
  orderReference: string;
  amount: number;
  methodKey: string;
  methodLabel: string;
}

/** Represents a local payment method option in the checkout UI */
export interface CheckoutPaymentOption {
  /** 'cash' | 'credit' | 'insurance' | or a key from PaymentMethodDto */
  key: string;
  label: string;
  icon: string;
  isElectronic: boolean;
}
