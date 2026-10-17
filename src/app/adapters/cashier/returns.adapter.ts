import { normalizeId } from '../../core/types/ids.types';

export interface ReturnViewModel {
  id: string;
  returnNo: string;
  requestorName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  returnDate: Date;
}

export function mapApiToReturnViewModel(apiResponse: any): ReturnViewModel {
  if (!apiResponse) {
    return {
      id: '', returnNo: '', requestorName: 'Unknown', itemCode: '', itemName: '',
      quantity: 0, status: 'pending', returnDate: new Date()
    };
  }

  return {
    id: normalizeId(apiResponse.id || apiResponse.returnId),
    returnNo: apiResponse.returnNo || apiResponse.code || '',
    requestorName: apiResponse.requestorName || apiResponse.customerName || 'Unknown',
    itemCode: apiResponse.itemCode || apiResponse.productCode || '',
    itemName: apiResponse.itemName || apiResponse.productName || '',
    quantity: Number(apiResponse.quantity || apiResponse.qty || 0),
    status: (apiResponse.status || 'pending').toLowerCase(),
    returnDate: new Date(apiResponse.returnDate || apiResponse.createdAt || Date.now())
  };
}

export function mapReturnError(errorCode: string): string {
  switch (errorCode?.toUpperCase()) {
    case 'INSUFFICIENT_QTY': return 'Insufficient quantity available for return.';
    case 'RETURN_EXPIRED': return 'The return period for this item has expired.';
    default: return 'An unknown error occurred while processing the return.';
  }
}
