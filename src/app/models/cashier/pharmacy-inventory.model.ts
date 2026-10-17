export interface PharmacyInventoryBatchOption {
  selectionKey: string;
  productId: string;
  itemCode: string;
  itemName: string;
  storeId: string;
  storeName: string;
  batchNo?: string | null;
  expiryDate?: string | Date | null;
  availableQuantity: number;
  unitPrice: number;
  needsBatch: boolean;
  needsExpiry: boolean;
  isPharmacyItem: boolean;
  isExpired: boolean;
  dosageForm?: string;
  strength?: string;
  displayLabel: string;
}

export interface PharmacyInventoryBatchLookup {
  productId: string;
  storeId?: string;
  batchNo?: string | null;
  expiryDate?: string | Date | null;
  needsBatch?: boolean;
  needsExpiry?: boolean;
}

export interface PharmacyInventoryProductOption {
  productId: string;
  itemCode: string;
  itemName: string;
  storeId: string;
  storeName: string;
  availableQuantity: number;
  unitPrice: number;
  needsBatch: boolean;
  needsExpiry: boolean;
  isPharmacyItem: boolean;
  dosageForm?: string;
  strength?: string;
  batches: PharmacyInventoryBatchOption[];
  preferredBatch?: PharmacyInventoryBatchOption | null;
}

/** One selectable stock row (store + product + batch) for restricted / controlled dispense UIs. */
export type PharmacyStockRestrictionType = 'controlled' | 'narcotic' | 'prescription_only' | 'high_alert';

export interface PharmacyRestrictedMedicationStockLine {
  selectionKey: string;
  storeDetailsId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  availableQty: number;
  batchNo: string;
  expiryDate: string | Date | null;
  unitName: string;
  needsBatch: boolean;
  needsExpiry: boolean;
  /** Populated when master data / lookup-stock API exposes clinical restriction (optional today). */
  restrictionType?: PharmacyStockRestrictionType | null;
  displayLabel: string;
}
