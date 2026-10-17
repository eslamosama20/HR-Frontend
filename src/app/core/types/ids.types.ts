export type PrescriptionId = string;
export type PrescriptionItemId = string;
export type StoreId = string;
export type ItemId = string;
export type PickupId = string;
export type AllocationId = string;

/**
 * Normalizes any ID to a string to prevent type mismatch issues.
 * Handles GUIDs, numbers, and string representations safely.
 */
export function normalizeId(id: any): string {
  if (id === null || id === undefined) {
    return '';
  }
  return String(id).trim();
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGuidString(value: unknown): boolean {
  const s = `${value ?? ''}`.trim();
  return s.length > 0 && GUID_RE.test(s);
}
