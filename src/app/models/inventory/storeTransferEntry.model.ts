import { EntityBase } from '../base/entity-base';
import { MainPurchaseClassModel } from '../purchase-classes-tree/mainPurchaseClass.model';
import { MainSalesClassModel } from '../sales-classes-tree/mainSalesClass.model';

export class StoreTransferEntryModel extends EntityBase {
  quantity: number = 1;
  mainPurchaseClassId?: string;
  mainSalesClassId?: string;
  storeTransferId?: string;

  mainPurchaseClass?: MainPurchaseClassModel;
  mainSalesClass?: MainSalesClassModel;

  constructor(data?: Partial<StoreTransferEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.quantity
      && (!!this.mainPurchaseClassId || !!this.mainSalesClassId);
  }
}
