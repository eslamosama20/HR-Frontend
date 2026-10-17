import {EntityBase} from '../base/entity-base';

export class ClientProfileModel extends EntityBase {

  englishName: string;
  arabicName: string;

  constructor(data?: Partial<ClientProfileModel>) {
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
