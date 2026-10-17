export type PharmacyAllocationMode = 'payload-preparation' | 'reservation' | 'deduction';

/** How the server applied stock for this dispense (client maps API `commitMode` / similar). */
export type PharmacyBackendCommitMode = 'deduction' | 'reservation' | 'payload_logged' | 'unknown';
export type PharmacyAllocationProcessStatus = 'pending' | 'prepared' | 'failed';
export type PharmacyAllocationLineStatus = 'pending' | 'prepared' | 'blocked';

export interface PharmacyAllocationOrderItemInput {
  prescriptionItemId: number;
  mainPurchaseClassId?: string;
  itemCode?: string;
  itemName: string;
  storeId?: string;
  storeName?: string;
  batchNo?: string | null;
  expiryDate?: string | Date | null;
  availableQuantity?: number | null;
  requestedQuantity: number;
  dispensedQuantity?: number | null;
  needsBatch?: boolean;
  needsExpiry?: boolean;
}

export interface PharmacyAllocationOrderInput {
  prescriptionId: number;
  rxNo: string;
  status?: string;
  paymentMethod?: string;
  notes?: string;
  items: PharmacyAllocationOrderItemInput[];
}

export interface PharmacyAllocationValidationIssue {
  code:
    | 'missing-product'
    | 'missing-store'
    | 'batch-required'
    | 'expiry-required'
    | 'batch-not-found'
    | 'expired-batch'
    | 'invalid-quantity'
    | 'insufficient-quantity'
    | 'already-dispensed'
    | 'invalid-status'
    | 'empty-order';
  message: string;
}

export interface PharmacyAllocationLine {
  prescriptionItemId: number;
  mainPurchaseClassId?: string;
  itemCode?: string;
  itemName: string;
  storeId?: string;
  storeName?: string;
  batchNo?: string | null;
  expiryDate?: string | null;
  requestedQuantity: number;
  dispensedQuantity: number;
  availableQuantity: number;
  needsBatch: boolean;
  needsExpiry: boolean;
  status: PharmacyAllocationLineStatus;
  validations: PharmacyAllocationValidationIssue[];
}

export interface PharmacyAllocationPayloadLine {
  prescriptionItemId: number;
  /** Inventory product key (same as mainPurchaseClassId in this ERP). */
  itemId: string;
  mainPurchaseClassId: string;
  itemCode?: string;
  itemName: string;
  storeId: string;
  storeName?: string;
  batchNo?: string | null;
  expiryDate?: string | null;
  requestedQuantity: number;
  dispensedQuantity: number;
  availableQuantity: number;
  needsBatch: boolean;
  needsExpiry: boolean;
  allocationMode: PharmacyAllocationMode;
}

export interface PharmacyAllocationPayload {
  prescriptionId: number;
  rxNo: string;
  allocationMode: PharmacyAllocationMode;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  totalRequestedQuantity: number;
  totalDispensedQuantity: number;
  lines: PharmacyAllocationPayloadLine[];
}

export interface PharmacyAllocationState {
  allocationMode: PharmacyAllocationMode;
  status: PharmacyAllocationProcessStatus;
  backendCommitted: boolean;
  /** Server-issued reference after successful allocate-and-dispense (reservation / transaction id). */
  allocationReferenceId?: string | null;
  backendCommitMode?: PharmacyBackendCommitMode;
  committedAt?: string | null;
  preparedAt: string;
  errorMessages: string[];
  payload: PharmacyAllocationPayload | null;
  lines: PharmacyAllocationLine[];
}

export interface PharmacyAllocationPreparationResult {
  canProceed: boolean;
  mode: PharmacyAllocationMode;
  errors: string[];
  state: PharmacyAllocationState;
  summary: {
    totalLines: number;
    totalRequestedQuantity: number;
    totalDispensedQuantity: number;
    distinctStores: number;
    distinctBatches: number;
  };
}
