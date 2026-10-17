import { normalizeId } from '../../core/types/ids.types';

export interface SallaOrderViewModel {
  id: string;
  referenceId: string;
  customerName: string;
  total: number;
  status: 'new' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export function mapApiToSallaOrderViewModel(apiResponse: any): SallaOrderViewModel {
  if (!apiResponse) {
    return {
      id: '', referenceId: '', customerName: 'Unknown', total: 0, status: 'new', createdAt: new Date()
    };
  }

  return {
    id: normalizeId(apiResponse.id || apiResponse.orderId),
    referenceId: apiResponse.referenceId || apiResponse.sallaId || '',
    customerName: apiResponse.customerName || apiResponse.clientName || 'Unknown',
    total: Number(apiResponse.total || apiResponse.amount || 0),
    status: (apiResponse.status || 'new').toLowerCase(),
    createdAt: new Date(apiResponse.createdAt || apiResponse.date || Date.now())
  };
}

export function mapSallaOrderError(errorCode: string): string {
  switch (errorCode?.toUpperCase()) {
    case 'ORDER_NOT_FOUND': return 'Salla order could not be located.';
    case 'SYNC_FAILED': return 'Failed to synchronize with Salla API.';
    case 'ALREADY_IMPORTED': return 'This order has already been imported.';
    default: return 'An unknown error occurred during Salla integration.';
  }
}
