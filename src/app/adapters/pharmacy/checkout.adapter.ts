import { normalizeId } from '../../core/types/ids.types';

export interface CheckoutRequest {
  pickupId: string;
  cashierSessionId: string;
  storeDetailsId: string;
  paymentMethod: string;
  cashAmount?: number;
  cardAmount?: number;
  notes?: string;
}

export interface CheckoutResponse {
  success: boolean;
  invoiceId?: string;
  invoiceNo?: string;
  changeAmount?: number;
  error?: string;
}

export function mapApiToViewModel(apiResponse: any): CheckoutResponse {
  if (!apiResponse) {
    return {
      success: false,
      error: 'Unknown error occurred during checkout'
    };
  }

  return {
    success: apiResponse.success === true || apiResponse.isSuccess === true,
    invoiceId: normalizeId(apiResponse.invoiceId || apiResponse.id),
    invoiceNo: apiResponse.invoiceNo || apiResponse.referenceNo,
    changeAmount: Number(apiResponse.changeAmount || 0),
    error: apiResponse.error ? mapCheckoutError(apiResponse.error) : undefined
  };
}

export function mapViewModelToApiRequest(viewModel: CheckoutRequest): any {
  return {
    pickupId: normalizeId(viewModel.pickupId),
    cashierSessionId: normalizeId(viewModel.cashierSessionId),
    storeDetailsId: normalizeId(viewModel.storeDetailsId),
    paymentMethod: viewModel.paymentMethod,
    cashAmount: viewModel.cashAmount || 0,
    cardAmount: viewModel.cardAmount || 0,
    notes: viewModel.notes || ''
  };
}

export function mapCheckoutError(errorCode: string): string {
  if (!errorCode) return 'Unknown checkout error.';
  
  const code = errorCode.toUpperCase();
  switch (code) {
    case 'NO_ACTIVE_SESSION':
      return 'No active cashier session found.';
    case 'INSUFFICIENT_QUANTITY':
      return 'Insufficient quantity in store.';
    case 'INVALID_STATUS':
      return 'Invalid prescription status for checkout.';
    case 'ALREADY_CHECKED_OUT':
      return 'This prescription has already been checked out.';
    default:
      return `Checkout failed: ${errorCode}`;
  }
}
