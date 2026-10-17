import {EntityBase} from '../base/entity-base';
import {ProductBatchToUnitAssignments} from "./productBatchToUnitAssignments.model";
import {BatchStatusModel} from "./batchStatus.model";

export class BatchDetailsModel extends EntityBase {
  expiryDate: Date;
  batchStatusId: string;
  batchStatus: BatchStatusModel;
  storeDetailsId: string;
  productBatchToUnitAssignments: ProductBatchToUnitAssignments[];


  constructor(data?: Partial<BatchDetailsModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.storeDetailsId
      && !!this.batchStatusId
      && !!this.expiryDate
  }
}
