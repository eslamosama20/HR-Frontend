import {EntityBase} from '../base/entity-base';

export class StoreStatusModel extends EntityBase {

  englishName: string;
  arabicName: string;

  constructor(data?: Partial<StoreStatusModel>) {
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
