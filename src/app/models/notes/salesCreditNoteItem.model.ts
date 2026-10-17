import {EntityBase} from "../base/entity-base";
import {Treasury} from "../treasury/treasury";
import {MainSalesClassModel} from "../sales-classes-tree/mainSalesClass.model";

export class SalesCreditNoteItemModel extends EntityBase {

  mainSalesClassId: string;
  mainSalesClass: MainSalesClassModel;

  itemNo: string;
  noOfNights: number = 1;
  price!: number;  // Required decimal field
  quantity!: number;  // Required decimal field

  salesCreditNoteId: string;

  constructor(data?: Partial<SalesCreditNoteItemModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.mainSalesClassId
      && !!this.price
      && !!this.quantity
  }
}
