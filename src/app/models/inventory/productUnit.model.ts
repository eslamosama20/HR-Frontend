import {EntityBase} from '../base/entity-base';
import {ProductUnitStatusModel} from "./productUnitStatus.model";
import { SupplierDetailsModel } from './supplierDetails.model';
import {MainSalesClassModel} from "../sales-classes-tree/mainSalesClass.model";
import {StoreDetailsModel} from "./storeDetails.model";
import {MainPurchaseClassModel} from "../purchase-classes-tree/mainPurchaseClass.model";

export class ProductUnitModel extends EntityBase {

  storeDetailsId: string;
  storeDetails: StoreDetailsModel;
  mainSalesClassId: string;
  mainSalesClass: MainSalesClassModel;
  mainPurchaseClassId: string;
  mainPurchaseClass: MainPurchaseClassModel;

  quantity?: number;
  batchNo?: string | null;
  expiryDate?: Date | string | null;


  constructor(data?: Partial<ProductUnitModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.storeDetailsId
      && (!!this.mainSalesClassId || !!this.mainPurchaseClassId)
      && !!this.quantity;
  }
}

