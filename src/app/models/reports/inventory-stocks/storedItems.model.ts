
export class StoredItemsModel {

  mainPurchaseClassId: string;
  mainPurchaseClassReferenceCode: string;
  mainPurchaseClassEnglishName: string;
  mainPurchaseClassArabicName: string;

  batchNo?: string | null;
  expiryDate?: string | Date | null;
  needsBatch?: boolean;
  needsExpiry?: boolean;
  isPharmacyItem?: boolean;
  itemType?: string | null;
  quantity: number;
  lastPrice: number;
  lastMonthAverage: number;
  constructor(data?: Partial<StoredItemsModel>) {
    if (!data) return;

    const anyData = data as unknown as Record<string, unknown>;

    Object.assign(this, data);

    // Backend DTOs may use PascalCase (BatchNo/ExpiryDate) — normalize to frontend shape.
    const batchNo =
      (anyData['batchNo'] as string | null | undefined) ??
      (anyData['BatchNo'] as string | null | undefined) ??
      (anyData['batchNO'] as string | null | undefined) ??
      null;

    const expiryDate =
      (anyData['expiryDate'] as string | Date | null | undefined) ??
      (anyData['ExpiryDate'] as string | Date | null | undefined) ??
      (anyData['expDate'] as string | Date | null | undefined) ??
      null;

    if (batchNo !== null && batchNo !== undefined) {
      this.batchNo = batchNo;
    }
    if (expiryDate !== null && expiryDate !== undefined) {
      this.expiryDate = expiryDate;
    }
  }
}
