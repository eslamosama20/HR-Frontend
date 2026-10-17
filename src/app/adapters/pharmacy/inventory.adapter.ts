import { normalizeId } from '../../core/types/ids.types';

export interface InventoryViewModel {
  id: string;
  storeId: string;
  itemId: string;
  availableQuantity: number;
  reservedQuantity: number;
  lastUpdated: Date;
}

export function mapApiToViewModel(apiResponse: any): InventoryViewModel {
  if (!apiResponse) {
    return {
      id: '',
      storeId: '',
      itemId: '',
      availableQuantity: 0,
      reservedQuantity: 0,
      lastUpdated: new Date()
    };
  }

  return {
    id: normalizeId(apiResponse.id || apiResponse.inventoryId),
    storeId: normalizeId(apiResponse.storeId || apiResponse.warehouseId),
    itemId: normalizeId(apiResponse.itemId || apiResponse.productId),
    availableQuantity: Number(apiResponse.availableQuantity || apiResponse.qty || 0),
    reservedQuantity: Number(apiResponse.reservedQuantity || apiResponse.allocatedQty || 0),
    lastUpdated: new Date(apiResponse.lastUpdated || apiResponse.updatedAt || Date.now())
  };
}

export function mapViewModelToApiRequest(viewModel: InventoryViewModel): any {
  return {
    inventoryId: viewModel.id,
    storeId: viewModel.storeId,
    itemId: viewModel.itemId,
    availableQuantity: viewModel.availableQuantity,
    reservedQuantity: viewModel.reservedQuantity
  };
}
