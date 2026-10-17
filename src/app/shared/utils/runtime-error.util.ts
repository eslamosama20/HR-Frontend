export function mapError(errorOrCode: unknown, fallback = 'Unexpected error. Please try again.'): string {
  const details = extractErrorDetails(errorOrCode);

  if (details.messageAr) {
    return details.messageAr;
  }

  switch (details.code) {
    case 'NO_ACTIVE_SESSION':
      return 'No active cashier session. Please open a session first.';
    case 'SESSION_NO_STORE':
      return 'The active cashier session is not linked to a store.';
    case 'ALREADY_CHECKED_OUT':
      return 'This prescription was already checked out.';
    case 'INVALID_STATUS':
      return 'This action is not allowed for the current status.';
    case 'INSUFFICIENT_QTY':
    case 'INSUFFICIENT_QUANTITY':
    case 'INSUFFICIENT_STOCK':
    case 'STOCK_NOT_AVAILABLE':
      return 'Insufficient stock is available to complete this action.';
    case 'ZID_PRODUCT_NOT_MAPPED':
      return 'One or more Zid products are not mapped to ERP items yet.';
    case 'ZID_SYNC_FAILED':
      return 'The Zid sync failed. Check mappings, stock, and store configuration.';
    case 'INSURANCE_CLAIM_REJECTED':
    case 'CLAIM_REJECTED':
      return 'The insurance claim was rejected.';
    case 'NPHIES_SUBMIT_FAILED':
      return 'Submitting the claim to NPHIES failed.';
    case 'NPHIES_POLL_FAILED':
      return 'Could not refresh the latest NPHIES status.';
    case 'VALIDATION_ERROR':
      return 'Some required data is missing or invalid.';
    default:
      break;
  }

  if (details.message) {
    return details.message;
  }

  return fallback;
}

export function extractErrorCode(errorOrCode: unknown): string {
  return extractErrorDetails(errorOrCode).code;
}

function extractErrorDetails(errorOrCode: unknown): { code: string; message: string; messageAr: string } {
  if (typeof errorOrCode === 'string') {
    return {
      code: normalizeCode(errorOrCode),
      message: '',
      messageAr: ''
    };
  }

  const error = errorOrCode as any;
  const payload = unwrapPayload(error?.error ?? error ?? {});
  return {
    code: normalizeCode(payload?.errorCode ?? payload?.code ?? error?.code ?? ''),
    message: `${payload?.message ?? payload?.error ?? error?.message ?? ''}`.trim(),
    messageAr: `${payload?.messageAr ?? ''}`.trim()
  };
}

function normalizeCode(value: unknown): string {
  return `${value ?? ''}`.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function unwrapPayload(payload: any): any {
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return unwrapPayload(payload.data);
  }
  if (payload?.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) {
    return unwrapPayload(payload.result);
  }
  return payload;
}
