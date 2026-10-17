import { EntityBase } from '../base/entity-base';
import { StoreDetailsModel } from './storeDetails.model';
import { StoreTransferEntryModel } from './storeTransferEntry.model';

export class StoreTransferModel extends EntityBase {
  referenceNumber: string;
  description: string;
  transferDate: Date | string;
  fromStoreId: string;
  toStoreId: string;
  shippingCost?: number;

  fromStore: StoreDetailsModel;
  toStore: StoreDetailsModel;
  transferEntries: StoreTransferEntryModel[];

  constructor(data?: Partial<StoreTransferModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.transferDate
      && !!this.fromStoreId
      && !!this.toStoreId
      && this.fromStoreId !== this.toStoreId;
  }
}
