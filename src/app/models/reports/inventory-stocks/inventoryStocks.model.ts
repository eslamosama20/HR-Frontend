import {StoredItemsModel} from "./storedItems.model";

export class InventoryStocksModel {
  storeDetailsId?: string;
  storeDetailsEnglishName?: string;
  storeDetailsArabicName?: string;
  storeCategory?: string;
  storeType?: string;
  isPharmacyStore?: boolean;

  storedItems: StoredItemsModel[];

  constructor(data?: Partial<InventoryStocksModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }

}
