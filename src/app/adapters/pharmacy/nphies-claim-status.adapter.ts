export type NphiesClaimStatus = 'pending' | 'queued' | 'approved' | 'partial' | 'rejected' | 'error';

export type LocalInsuranceClaimStatus =
  | 'Pending'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Paid'
  | 'PartiallyApproved';

export type ClaimTagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export function normalizeNphiesStatus(value: unknown): NphiesClaimStatus {
  const status = `${value ?? ''}`.trim().toLowerCase().replace(/\s+/g, '_');

  if (['complete', 'completed', 'approved', 'accepted'].includes(status)) {
    return 'approved';
  }
  if (['partially_approved', 'partial_approval', 'partial'].includes(status)) {
    return 'partial';
  }
  if (['reject', 'rejected', 'denied'].includes(status)) {
    return 'rejected';
  }
  if (['failed', 'failure', 'error', 'unavailable'].includes(status)) {
    return 'error';
  }
  if (['queued', 'submitted', 'processing', 'in_progress'].includes(status)) {
    return 'queued';
  }

  return 'pending';
}

export function normalizeLocalClaimStatus(value: unknown): LocalInsuranceClaimStatus {
  const status = `${value ?? ''}`.trim().toLowerCase().replace(/[\s_-]+/g, '');

  if (['pending', 'inprogress'].includes(status)) {
    return 'Pending';
  }
  if (['submitted', 'inreview', 'in_review'].includes(status)) {
    return 'Submitted';
  }
  if (['approved'].includes(status)) {
    return 'Approved';
  }
  if (['rejected', 'denied'].includes(status)) {
    return 'Rejected';
  }
  if (['paid'].includes(status)) {
    return 'Paid';
  }
  if (['partial', 'partiallyapproved', 'partialapproval'].includes(status)) {
    return 'PartiallyApproved';
  }

  return 'Submitted';
}

export function localStatusToApiStatus(status: LocalInsuranceClaimStatus): string {
  return mapLocalToBackendClaimStatus(status);
}

/** Lowercase values expected by `PATCH /v1/pharmacy/insurance-claims/{id}/status` */
export function mapLocalToBackendClaimStatus(status: LocalInsuranceClaimStatus): string {
  switch (status) {
    case 'Pending':
      return 'pending';
    case 'Submitted':
      return 'submitted';
    case 'Approved':
      return 'approved';
    case 'Rejected':
      return 'rejected';
    case 'Paid':
      return 'approved';
    case 'PartiallyApproved':
      return 'submitted';
    default:
      return 'pending';
  }
}

export function nphiesStatusSeverity(status: NphiesClaimStatus): ClaimTagSeverity {
  switch (status) {
    case 'approved':
      return 'success';
    case 'partial':
      return 'info';
    case 'rejected':
    case 'error':
      return 'danger';
    case 'queued':
      return 'warning';
    case 'pending':
    default:
      return 'secondary';
  }
}

export function localStatusSeverity(status: LocalInsuranceClaimStatus): ClaimTagSeverity {
  switch (status) {
    case 'Approved':
    case 'Paid':
      return 'success';
    case 'PartiallyApproved':
      return 'info';
    case 'Rejected':
      return 'danger';
    case 'Pending':
      return 'secondary';
    case 'Submitted':
    default:
      return 'warning';
  }
}
