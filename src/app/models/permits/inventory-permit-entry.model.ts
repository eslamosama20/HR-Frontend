import {EntityBase} from "../base/entity-base";
import {MainPurchaseClassModel} from "../purchase-classes-tree/mainPurchaseClass.model";
import {MainSalesClassModel} from "../sales-classes-tree/mainSalesClass.model";

export class InventoryPermitEntryModel extends EntityBase {

  unitPrice: number;
  quantity: number = 1;
  retailPrice: number = 0;
  wholesalePrice: number = 0;
  bulkPrice: number = 0;
  mainPurchaseClassId?:string;
  mainSalesClassId?:string;
  inventoryPermitId?:string;
  
  batchNo?: string | null;
  shelfNumber?: string;
  rowNumber?: string;
  expiryDate?: Date | string | null;

  mainPurchaseClass?: MainPurchaseClassModel;
  mainSalesClass?: MainSalesClassModel;
  constructor(data?: Partial<InventoryPermitEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.unitPrice
      && !!this.quantity
  }
}
