import {
  LocalInsuranceClaimStatus,
  NphiesClaimStatus,
  mapLocalToBackendClaimStatus,
  normalizeLocalClaimStatus,
  normalizeNphiesStatus
} from './nphies-claim-status.adapter';

export interface InsuranceClaimViewModel {
  id: string;
  claimNo: string;
  rxNo: string;
  patientName: string;
  insurer: string;
  totalAmount: number;
  insuranceCoveredAmount: number;
  patientShareAmount: number;
  coveragePercentage: number;
  approvedAmount: number;
  status: LocalInsuranceClaimStatus;
  nphiesStatus: NphiesClaimStatus;
  nphiesClaimId: string;
  saleInvoiceId: number | null;
  prescriptionId: string | null;
  cashierPaymentId: string | null;
  referenceNo: string;
  submittedAt: Date | null;
  nphiesSubmittedAt: Date | null;
  adjudicatedAt: Date | null;
  processedAt: Date | null;
  notes: string;
  attachmentName: string;
}

export interface CreateInsuranceClaimRequest {
  rxNo: string;
  patientName: string;
  insurer: string;
  totalAmount: number;
  prescriptionId?: string;
  referenceNo?: string;
  notes?: string;
}

export interface UpdateInsuranceClaimStatusRequest {
  status: LocalInsuranceClaimStatus;
  approvedAmount?: number;
  notes?: string;
  referenceNo?: string;
}

export interface SubmitClaimRequest {
  saleInvoiceId?: number | null;
  cashierPaymentId?: string | null;
}

export interface SubmitClaimResult {
  success: boolean;
  claimId: string | null;
  nphiesClaimId: string;
  nphiesStatus: NphiesClaimStatus;
  message: string;
  messageAr: string;
  claim?: InsuranceClaimViewModel | null;
}

export interface InsuranceClaimListResult {
  items: InsuranceClaimViewModel[];
  total: number;
}

export function mapInsuranceClaimListResponse(source: any): InsuranceClaimListResult {
  const items = extractItems(source).map((item) => mapInsuranceClaim(item));
  const total = Number(source?.total ?? source?.totalCount ?? source?.count ?? source?.result?.total ?? items.length) || items.length;
  return { items, total };
}

export function mapInsuranceClaim(source: any): InsuranceClaimViewModel {
  source = unwrapClaimEnvelope(source);
  const totalAmount = toNumber(source?.totalAmount ?? source?.claimAmount);
  const insuranceCoveredAmount = toNumber(
    source?.insuranceCoveredAmount ?? source?.insuranceShare ?? source?.coveredAmount ?? source?.approvedAmount
  );
  const patientShareAmount = toNumber(
    source?.patientShareAmount ?? source?.patientShare ?? source?.patientAmount ?? Math.max(0, totalAmount - insuranceCoveredAmount)
  );
  const coveragePercentage = toNumber(
    source?.coveragePercentage ?? source?.insuranceCoveragePercentage ?? calcCoverage(totalAmount, insuranceCoveredAmount)
  );

  return {
    id: `${source?.id ?? source?.claimId ?? ''}`,
    claimNo: `${source?.claimNo ?? source?.code ?? source?.referenceNo ?? source?.id ?? ''}`,
    rxNo: `${source?.rxNo ?? source?.prescriptionNo ?? source?.prescription?.rxNo ?? ''}`,
    patientName: `${source?.patientName ?? source?.patient?.fullName ?? source?.patient?.name ?? ''}`,
    insurer: `${source?.insurer ?? source?.insuranceName ?? source?.insuranceCompanyName ?? source?.insurance?.companyName ?? ''}`,
    totalAmount,
    insuranceCoveredAmount,
    patientShareAmount,
    coveragePercentage,
    approvedAmount: toNumber(source?.approvedAmount ?? insuranceCoveredAmount),
    status: normalizeLocalClaimStatus(source?.status ?? source?.claimStatus),
    nphiesStatus: normalizeNphiesStatus(source?.nphiesStatus ?? source?.nphies?.status),
    nphiesClaimId: `${source?.nphiesClaimId ?? source?.nphies?.claimId ?? ''}`,
    saleInvoiceId: toNullableNumber(source?.saleInvoiceId ?? source?.invoiceId),
    prescriptionId: toNullableString(source?.prescriptionId ?? source?.pharmacyPrescriptionId),
    cashierPaymentId: toNullableString(source?.cashierPaymentId),
    referenceNo: `${source?.referenceNo ?? ''}`,
    submittedAt: toDateOrNull(source?.submittedAt ?? source?.createdAt),
    nphiesSubmittedAt: toDateOrNull(source?.nphiesSubmittedAt),
    adjudicatedAt: toDateOrNull(source?.nphiesAdjudicatedAt ?? source?.adjudicatedAt),
    processedAt: toDateOrNull(source?.processedAt),
    notes: `${source?.notes ?? source?.message ?? ''}`,
    attachmentName: `${source?.attachmentName ?? ''}`
  };
}

export function mapCreateInsuranceClaimRequest(draft: CreateInsuranceClaimRequest): Record<string, unknown> {
  return {
    rxNo: draft.rxNo,
    patientName: draft.patientName,
    insurer: draft.insurer,
    totalAmount: Number(draft.totalAmount) || 0,
    prescriptionId: draft.prescriptionId || undefined,
    referenceNo: draft.referenceNo || undefined,
    notes: draft.notes || undefined
  };
}

export function mapUpdateInsuranceClaimStatusRequest(draft: UpdateInsuranceClaimStatusRequest): Record<string, unknown> {
  return {
    status: mapLocalToBackendClaimStatus(draft.status),
    approvedAmount: draft.approvedAmount != null ? Number(draft.approvedAmount) || 0 : undefined,
    notes: draft.notes || undefined,
    referenceNo: draft.referenceNo || undefined
  };
}

export function mapSubmitClaimResponse(source: any): SubmitClaimResult {
  const claim = unwrapClaimEnvelope(source?.claim ?? source?.data ?? source?.result ?? source);
  return {
    success: Boolean(source?.success ?? true),
    claimId: toNullableString(source?.claimId ?? claim?.id),
    nphiesClaimId: `${source?.nphiesClaimId ?? claim?.nphiesClaimId ?? ''}`,
    nphiesStatus: normalizeNphiesStatus(source?.nphiesStatus ?? claim?.nphiesStatus),
    message: `${source?.message ?? ''}`,
    messageAr: `${source?.messageAr ?? ''}`,
    claim: claim && typeof claim === 'object' ? mapInsuranceClaim(claim) : null
  };
}

export function formatInsuranceApiError(error: any): string {
  const body = error?.error;
  const raw = typeof body === 'string'
    ? body
    : body?.messageAr || body?.message || body?.detail || body?.title || error?.message || '';
  const message = `${raw}`.toLowerCase();

  if (error?.status === 404 || message.includes('not found')) {
    return 'Claim not found or no claim exists for this prescription.';
  }
  if (message.includes('already') || message.includes('duplicate')) {
    return 'Claim already submitted. Refresh the list to see the current status.';
  }
  if (message.includes('no insurance') || message.includes('coverage')) {
    return 'This prescription has no insurance coverage.';
  }
  if (message.includes('nphies') || message.includes('unavailable') || error?.status === 0) {
    return 'NPHIES is unavailable or integration configuration is missing.';
  }
  if (message.includes('auth') || error?.status === 401 || error?.status === 403) {
    return 'Authentication or CCHI/NPHIES configuration is missing.';
  }
  if (message.includes('rejected')) {
    return 'Approval rejected by insurance/NPHIES.';
  }
  if (message.includes('partial')) {
    return 'Partial approval returned. Review insurer share and patient share.';
  }

  return raw || 'Insurance claim operation failed.';
}

function extractItems(source: any): any[] {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.items)) return source.items;
  if (Array.isArray(source?.data)) return source.data;
  if (Array.isArray(source?.result?.items)) return source.result.items;
  if (Array.isArray(source?.result?.data)) return source.result.data;
  return [];
}

function toNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function toNullableNumber(value: unknown): number | null {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

function toNullableString(value: unknown): string | null {
  const result = `${value ?? ''}`.trim();
  return result ? result : null;
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calcCoverage(total: number, covered: number): number {
  return total > 0 ? Math.round((covered / total) * 10000) / 100 : 0;
}

function unwrapClaimEnvelope(source: any): any {
  if (source?.claim && typeof source.claim === 'object') {
    return unwrapClaimEnvelope(source.claim);
  }
  if (source?.data && typeof source.data === 'object' && !Array.isArray(source.data)) {
    return unwrapClaimEnvelope(source.data);
  }
  if (source?.result && typeof source.result === 'object' && !Array.isArray(source.result)) {
    return unwrapClaimEnvelope(source.result);
  }
  return source ?? {};
}
