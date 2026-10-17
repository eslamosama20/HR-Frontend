import {EntityBase} from '../base/entity-base';
import {DomainDetailsModel} from "./domainDetails.model";

export class PermissionModel extends EntityBase {

  name: string;
  arabicName: string;
  description: string;
  domainDetailsId: string;
  domainDetails: DomainDetailsModel;

  constructor(data?: Partial<PermissionModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }


}
