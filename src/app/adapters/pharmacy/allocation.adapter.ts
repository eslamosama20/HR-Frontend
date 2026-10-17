import { normalizeId } from '../../core/types/ids.types';

export interface AllocationViewModel {
  id: string;
  itemId: string;
  batchId: string;
  quantity: number;
  status: string;
}

export interface AllocationLineViewModel {
  prescriptionItemId: string;
  itemId: string;
  storeId: string;
  batchNo: string;
  expiryDate: Date;
  requestedQuantity: number;
  committedQuantity: number;
  availableQuantityAtCommit: number;
  isFullyCommitted: boolean;
}

export interface AllocateAndDispenseResultViewModel {
  success: boolean;
  lines: AllocationLineViewModel[];
  totalRequested: number;
  totalCommitted: number;
}

export function mapApiToViewModel(apiResponse: any): AllocationViewModel {
  if (!apiResponse) {
    return {
      id: '',
      itemId: '',
      batchId: '',
      quantity: 0,
      status: 'unknown'
    };
  }

  return {
    id: normalizeId(apiResponse.id || apiResponse.allocationId),
    itemId: normalizeId(apiResponse.itemId || apiResponse.productId),
    batchId: normalizeId(apiResponse.batchId),
    quantity: Number(apiResponse.quantity || apiResponse.qty || 0),
    status: (apiResponse.status || 'pending').toLowerCase()
  };
}

/**
 * Maps the enriched allocate-and-dispense response (with lines[]) to a structured view model.
 * Backend now returns per-line allocation details after the Alignment Fix.
 */
export function mapAllocateAndDispenseResponse(apiResponse: any): AllocateAndDispenseResultViewModel {
  if (!apiResponse) {
    return { success: false, lines: [], totalRequested: 0, totalCommitted: 0 };
  }

  const lines: AllocationLineViewModel[] = Array.isArray(apiResponse.lines)
    ? apiResponse.lines.map((line: any) => ({
        prescriptionItemId: normalizeId(line.prescriptionItemId),
        itemId: normalizeId(line.itemId),
        storeId: normalizeId(line.storeId),
        batchNo: line.batchNo || '',
        expiryDate: new Date(line.expiryDate || Date.now()),
        requestedQuantity: Number(line.requestedQuantity || 0),
        committedQuantity: Number(line.committedQuantity || 0),
        availableQuantityAtCommit: Number(line.availableQuantityAtCommit || 0),
        isFullyCommitted: Number(line.committedQuantity || 0) >= Number(line.requestedQuantity || 0)
      }))
    : [];

  return {
    success: apiResponse.success !== false,
    lines,
    totalRequested: lines.reduce((sum, l) => sum + l.requestedQuantity, 0),
    totalCommitted: lines.reduce((sum, l) => sum + l.committedQuantity, 0)
  };
}

export function mapViewModelToApiRequest(viewModel: AllocationViewModel): any {
  return {
    allocationId: viewModel.id,
    itemId: viewModel.itemId,
    batchId: viewModel.batchId,
    quantity: viewModel.quantity,
    status: viewModel.status
  };
}
