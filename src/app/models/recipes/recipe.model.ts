import {EntityBase} from "../base/entity-base";
import {MainSalesClassModel} from "../sales-classes-tree/mainSalesClass.model";
import {RecipeEntryModel} from "./recipe-entry.model";

export class RecipeModel extends EntityBase {

  referenceNumber: string;
  description: string;

  mainSalesClassId: string;
  mainSalesClass: MainSalesClassModel;

  recipeEntries: RecipeEntryModel[];
  numberOfPersons: number;

  // just to load the name
  mainSalesClassName: string;
  constructor(data?: Partial<RecipeModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.mainSalesClassId
      && this.recipeEntries.length > 0
  }
}
