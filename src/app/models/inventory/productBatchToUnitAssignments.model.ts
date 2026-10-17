import {EntityBase} from '../base/entity-base';
import {BatchUnitStatusModel} from "./batchUnitStatus.model";
import {ProductUnitModel} from "./productUnit.model";

export class ProductBatchToUnitAssignments extends EntityBase {
  productUnit: ProductUnitModel;
  productUnitId: string;
  productBatchDetailsId: string;
  batchUnitStatusId: string;
  batchUnitStatus: BatchUnitStatusModel;

  constructor(data?: Partial<ProductBatchToUnitAssignments>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.productUnitId
      && !!this.productBatchDetailsId
      && !!this.batchUnitStatusId
  }
}
