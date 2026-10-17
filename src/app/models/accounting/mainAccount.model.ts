import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from './clientProfile.model';
import { HeaderAccountModel } from './headerAccount.model';
import { RootAccountModel } from './rootAccount.model';

export class MainAccountModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  detailAccountId: string;

  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  constructor(data?: Partial<MainAccountModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.detailAccountId
  }
}
