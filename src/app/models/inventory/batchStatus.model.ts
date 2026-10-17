import {EntityBase} from '../base/entity-base';

export class BatchStatusModel extends EntityBase {

  englishName: string;
  arabicName: string;

  constructor(data?: Partial<BatchStatusModel>) {
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
