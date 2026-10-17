import {EntityBase} from '../base/entity-base';
import { HeaderAccountModel } from './headerAccount.model';

export class RootAccountModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  headerAccounts: HeaderAccountModel[];

  icon: string;
  constructor(data?: Partial<RootAccountModel>) {
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
