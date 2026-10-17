import { normalizeId } from '../../core/types/ids.types';

export interface BatchViewModel {
  id: string;
  itemCode: string;
  itemName: string;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
  minQuantity: number;
  storeName: string;
  isQuarantined: boolean;
  notes: string;
  status: 'ok' | 'near_expiry' | 'expired' | 'low_stock';
}

export function mapApiToBatchViewModel(apiResponse: any): BatchViewModel {
  if (!apiResponse) {
    return {
      id: '', itemCode: '', itemName: 'Unknown', batchNo: '',
      expiryDate: new Date(), quantity: 0, minQuantity: 0,
      storeName: '', isQuarantined: false, notes: '', status: 'ok'
    };
  }

  const expiryDate = new Date(apiResponse.expiryDate || apiResponse.expDate || Date.now());
  const quantity = Number(apiResponse.quantity || apiResponse.qty || 0);
  const minQuantity = Number(apiResponse.minQuantity || apiResponse.minQty || 0);

  // Calculate Status dynamically if backend didn't provide a reliable one
  let status: 'ok' | 'near_expiry' | 'expired' | 'low_stock' = 'ok';
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) {
    status = 'expired';
  } else if (quantity <= minQuantity) {
    status = 'low_stock';
  } else if (daysLeft <= 90) {
    status = 'near_expiry';
  } else {
    status = (apiResponse.status as any) || 'ok';
  }

  return {
    id: normalizeId(apiResponse.id || apiResponse.batchId),
    itemCode: apiResponse.itemCode || apiResponse.code || '',
    itemName: apiResponse.itemName || apiResponse.name || 'Unknown',
    batchNo: apiResponse.batchNo || apiResponse.lotNumber || '',
    expiryDate,
    quantity,
    minQuantity,
    storeName: apiResponse.storeName || apiResponse.warehouse || '',
    isQuarantined: apiResponse.isQuarantined === true || apiResponse.quarantine === true,
    notes: apiResponse.notes || '',
    status
  };
}

export function mapBatchError(errorCode: string): string {
  switch (errorCode?.toUpperCase()) {
    case 'BATCH_NOT_FOUND': return 'Batch record was not found.';
    case 'INVALID_EXPIRY': return 'The expiry date provided is invalid.';
    default: return 'An unknown error occurred while fetching batches.';
  }
}
