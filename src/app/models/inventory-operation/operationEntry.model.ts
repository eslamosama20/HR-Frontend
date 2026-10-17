import {EntityBase} from '../base/entity-base';
import { StoreDetailsModel } from '../inventory/storeDetails.model';
import {MainPurchaseClassModel} from "../purchase-classes-tree/mainPurchaseClass.model";

export class OperationEntryModel extends EntityBase {

  unitPrice: number;
  quantity: number;

  mainPurchaseClassId?: string;
  mainPurchaseClass: MainPurchaseClassModel;

  storeDetailsId?: string;
  storeDetails: StoreDetailsModel;

  inventoryOperationId?: string;

  constructor(data?: Partial<OperationEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.unitPrice
      && !!this.quantity
      && !!this.mainPurchaseClassId
  }
}
