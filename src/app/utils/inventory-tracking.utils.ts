import { formatDateOnlyToString } from './dateUtils';

export interface InventoryTrackingKeyInput {
  productId?: string | null;
  batchNo?: string | null;
  expiryDate?: Date | string | null;
  shelfNumber?: string | null;
  rowNumber?: string | null;
}

function normalizeKeyPart(value: string | null | undefined, emptyValue: string): string {
  const normalized = `${value ?? ''}`.trim();
  return normalized.length > 0 ? normalized : emptyValue;
}

function normalizeDatePart(value?: Date | string | null): string {
  if (!value) {
    return 'no-expiry';
  }

  const formatted = formatDateOnlyToString(value);
  if (formatted) {
    return formatted;
  }

  return normalizeKeyPart(`${value}`, 'no-expiry');
}

export function normalizeBatchNo(batchNo?: string | null): string | null {
  const normalized = `${batchNo ?? ''}`.trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildInventoryTrackingKey(input: InventoryTrackingKeyInput): string {
  return [
    normalizeKeyPart(input.productId, 'no-product'),
    normalizeKeyPart(normalizeBatchNo(input.batchNo) ?? undefined, 'no-batch'),
    normalizeDatePart(input.expiryDate),
    normalizeKeyPart(input.shelfNumber, 'no-shelf'),
    normalizeKeyPart(input.rowNumber, 'no-row'),
  ].join('__');
}
