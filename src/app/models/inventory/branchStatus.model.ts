import {EntityBase} from '../base/entity-base';

export class BranchStatusModel extends EntityBase {

  englishName: string;
  arabicName: string;

  constructor(data?: Partial<BranchStatusModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
  }
}
