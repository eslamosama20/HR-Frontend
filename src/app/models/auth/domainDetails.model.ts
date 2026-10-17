import {EntityBase} from '../base/entity-base';

export class DomainDetailsModel extends EntityBase {

  name: string;


  constructor(data?: Partial<DomainDetailsModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }


}
