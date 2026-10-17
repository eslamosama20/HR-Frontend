/**
 * Frontend DTOs for pharmacy POS pickup & prescription CRUD (mock-ready, backend-agnostic).
 */

export type InsuranceApprovalUiStatus = 'pending' | 'approved' | 'rejected';

export type PrescriptionLifecycleUiState = 'draft' | 'editing' | 'ready';

export interface PrescriptionPatientRefDto {
  /** Backend patient id when known */
  patientId?: string;
  displayName: string;
  nationalId?: string;
  phone?: string;
}

export interface PrescriptionItemDto {
  /** Stable client key until server returns line id */
  clientLineId: string;
  /** Server line id after persist */
  serverLineId?: string;
  /** Mapped catalog / inventory id when selected (Guid from backend) */
  catalogItemId?: string;
  name: string;
  qty: number;
  dosage?: string;
  notes?: string;
  batchNo?: string;
  expiryDate?: string;
}

export interface PrescriptionDto {
  /** Client-side draft id (uuid-like); serverPrescriptionId set after mock save */
  id: string;
  serverPrescriptionId?: string;
  prescriptionNo: string;
  patient: PrescriptionPatientRefDto;
  doctorName?: string;
  notes?: string;
  items: PrescriptionItemDto[];
  lifecycleState: PrescriptionLifecycleUiState;
  insuranceApprovalStatus: InsuranceApprovalUiStatus;
  createdAt: string;
  updatedAt: string;
}

export type ReadyPickupStatus = 'ready_for_pickup' | 'picked_up' | 'cancelled' | 'unknown';

export type AllocationStatusUi = 'pending' | 'allocated' | 'ready';

export interface ReadyPrescriptionLineDto {
  prescriptionItemId: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxPercentage?: number;
  batchNo?: string | null;
  expiryDate?: string | null;
  patientShare?: number | null;
  insuranceShare?: number | null;
  allocationStatus?: AllocationStatusUi;
}

export interface ReadyPrescriptionDto {
  pickupId: string;
  prescriptionId: string;
  prescriptionNo: string;
  patientName: string;
  patientId?: string;
  lines: ReadyPrescriptionLineDto[];
  pickupStatus: ReadyPickupStatus;
}

export interface ReturnRequestLineDto {
  invoiceLineId: string;
  returnQty: number;
  itemCode?: string;
  itemName?: string;
  unitPrice?: number;
  refundAmount?: number;
}

export interface ReturnRequestDto {
  originalInvoiceId: string;
  originalInvoiceNo: string;
  cashierSessionId?: string;
  reasonCode: string;
  notes?: string;
  refundMethod: 'cash' | 'card' | 'credit_note' | 'original_method';
  lines: ReturnRequestLineDto[];
}

export interface ReturnRequestResultDto {
  returnRequestId: string;
  status: 'pending' | 'accepted';
  refundTotalAmount: number;
  message?: string;
}
