import {EntityBase} from '../base/entity-base';
import {StoreStatusModel} from "./storeStatus.model";
import {MainAccountModel} from "../accounting/mainAccount.model";

export enum StoreType {
  Store = 'Store',
  Warehouse = 'Warehouse',
}

export enum StoreCategory {
  General = 'general',
  Pharmacy = 'pharmacy',
  Warehouse = 'warehouse',
  Retail = 'retail',
}

export type StoreCategoryLike = StoreCategory | StoreType | string | null | undefined;

export function normalizeStoreCategory(value?: StoreCategoryLike): StoreCategory {
  switch ((value ?? '').toString().trim().toLowerCase()) {
    case StoreCategory.Pharmacy:
      return StoreCategory.Pharmacy;
    case StoreCategory.Warehouse:
    case StoreType.Warehouse.toLowerCase():
      return StoreCategory.Warehouse;
    case StoreCategory.Retail:
      return StoreCategory.Retail;
    case StoreCategory.General:
    case StoreType.Store.toLowerCase():
    default:
      return StoreCategory.General;
  }
}

export function toLegacyStoreType(category?: StoreCategoryLike): StoreType {
  return normalizeStoreCategory(category) === StoreCategory.Warehouse
    ? StoreType.Warehouse
    : StoreType.Store;
}

export function isPharmacyStore(store?: Pick<StoreDetailsModel, 'storeCategory' | 'storeType'> | null): boolean {
  return normalizeStoreCategory(store?.storeCategory ?? store?.storeType) === StoreCategory.Pharmacy;
}


export class StoreDetailsModel extends EntityBase {
  arabicName: string;
  englishName: string;
  storeStatus?: StoreStatusModel;
  storeStatusId: string;
  storeType: StoreType = StoreType.Store;
  storeCategory: StoreCategory = StoreCategory.General;
  batches: any[];
  mainAccountId: string;
  mainAccount: MainAccountModel;

  constructor(data?: Partial<StoreDetailsModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }

    this.storeCategory = normalizeStoreCategory(this.storeCategory ?? this.storeType);
    this.storeType = toLegacyStoreType(this.storeCategory);
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
      && !!this.englishName
      && !!this.storeType
      && !!this.storeCategory
  }
}
