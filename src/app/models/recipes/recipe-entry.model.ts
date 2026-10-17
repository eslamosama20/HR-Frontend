import {EntityBase} from "../base/entity-base";
import {MainPurchaseClassModel} from "../purchase-classes-tree/mainPurchaseClass.model";

export class RecipeEntryModel extends EntityBase {

  quantity: number = 1;
  mainPurchaseClassId:string;
  recipeId:string;
  mainPurchaseClass: MainPurchaseClassModel;
  constructor(data?: Partial<RecipeEntryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.quantity
      && !!this.mainPurchaseClassId
  }
}
