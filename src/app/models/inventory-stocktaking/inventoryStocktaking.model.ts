import {EntityBase} from '../base/entity-base';
import { StoreDetailsModel } from '../inventory/storeDetails.model';
import { StocktakingEntryModel } from './stocktakingEntry.model';
import {AttachmentModel} from "../Attachments/attachment.model";

export class InventoryStocktakingModel extends EntityBase {

  referenceNumber: string;
  description: string;
  stocktakingDate: Date | string;
  transactionId?: string;
  storeDetailsId?: string;
  storeDetails?: StoreDetailsModel;

  stocktakingEntries: StocktakingEntryModel[];

  attachments: AttachmentModel[];
  constructor(data?: Partial<InventoryStocktakingModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !this.storeDetailsId
  }
}
