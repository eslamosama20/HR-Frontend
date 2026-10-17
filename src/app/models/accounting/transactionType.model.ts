import {EntityBase} from '../base/entity-base';

export class TransactionTypeModel extends EntityBase {

  englishName: string;
  arabicName: string;

  constructor(data?: Partial<TransactionTypeModel>) {
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
