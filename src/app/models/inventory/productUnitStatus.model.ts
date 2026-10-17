import {EntityBase} from '../base/entity-base';

export class ProductUnitStatusModel extends EntityBase {
  arabicName: string;
  englishName: string;

  constructor(data?: Partial<ProductUnitStatusModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
      && !!this.englishName;
  }
}

