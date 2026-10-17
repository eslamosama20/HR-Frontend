import { CartItem } from 'src/app/models/cashier/pos-invoice.model';

export function getSinglePharmacyPrescriptionIdForPayment(cart: CartItem[]): string | null {
  const prescriptionIds = Array.from(
    new Set(
      (cart || [])
        .map((item) => item.prescriptionMeta?.prescriptionId)
        .filter((id): id is string => !!id)
    )
  );

  return prescriptionIds.length === 1 ? prescriptionIds[0] : null;
}

export function getSinglePharmacyPickupIdForCheckout(cart: CartItem[]): string | null {
  const pickupIds = Array.from(
    new Set(
      (cart || [])
        .map((item) => item.prescriptionMeta?.pickupId)
        .filter((id): id is string => !!id)
    )
  );

  return pickupIds.length === 1 ? pickupIds[0] : null;
}

export function getCartPatientShareTotal(cart: CartItem[]): number | null {
  const patientShares = (cart || [])
    .map((item) => item.prescriptionMeta?.patientShare)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (!patientShares.length) {
    return null;
  }

  return patientShares.reduce((sum, value) => sum + value, 0);
}
