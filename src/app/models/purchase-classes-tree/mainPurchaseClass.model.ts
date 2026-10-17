import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from '../accounting/clientProfile.model';
import {MeasurementUnitModel} from "../inventory/measurementUnit.model";
import {StoreDetailsModel} from "../inventory/storeDetails.model";

export type MainPurchaseItemType = 'general' | 'medication' | 'service';

export function normalizeMainPurchaseItemType(value?: string | null): MainPurchaseItemType {
  const normalized = `${value ?? ''}`.trim().toLowerCase();

  if (normalized === 'medication' || normalized === 'medicine' || normalized === 'drug') {
    return 'medication';
  }

  if (normalized === 'service') {
    return 'service';
  }

  return 'general';
}

export class MainPurchaseClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  detailPurchaseClassId: string;

  clientProfileId: string;
  clientProfile: ClientProfileModel;

  measurementUnitId: string;
  measurementUnit: MeasurementUnitModel;

  icon: string;

  imageUrl?: string;

  productUnitsCount: number;

  lastPrice?: number = 0;
  lastMonthAveragePrice?: number = 0;

  /**
   * Product behavior classification (pharmacy-ready foundation).
   * Backward-safe defaults are applied in the constructor.
   */
  itemType?: MainPurchaseItemType;
  needsBatch?: boolean;
  needsExpiry?: boolean;
  isPharmacyItem?: boolean;
  sfdaCode?: string | null;
  isControlled?: boolean;

  constructor(data?: Partial<MainPurchaseClassModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }

    // Backward compatibility defaults (old records may not have these fields).
    this.itemType = normalizeMainPurchaseItemType(this.itemType);
    this.needsBatch = this.needsBatch ?? false;
    this.needsExpiry = this.needsExpiry ?? false;
    this.isPharmacyItem = this.isPharmacyItem ?? this.itemType === 'medication';
    this.sfdaCode = this.sfdaCode ?? null;
    this.isControlled = this.isControlled ?? false;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.measurementUnitId
  }
}
