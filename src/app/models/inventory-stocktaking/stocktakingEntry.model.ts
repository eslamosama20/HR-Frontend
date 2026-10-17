import {EntityBase} from '../base/entity-base';
import { StoreDetailsModel } from '../inventory/storeDetails.model';
import {MainPurchaseClassModel} from "../purchase-classes-tree/mainPurchaseClass.model";

export class StocktakingEntryModel extends EntityBase {

  reportedQuantity: number;
  actualQuantity: number;

  mainPurchaseClassId?: string;
  mainPurchaseClass?: MainPurchaseClassModel;
  inventoryStocktakingId?: string;

  constructor(data?: Partial<StocktakingEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.reportedQuantity
      && !!this.actualQuantity
      && !!this.mainPurchaseClassId
  }
}
