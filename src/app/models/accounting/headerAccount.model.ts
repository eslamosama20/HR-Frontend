import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from './clientProfile.model';
import { DetailAccountModel } from './detailAccount.model';
import { RootAccountModel } from './rootAccount.model';

export class HeaderAccountModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;

  rootAccountId: string;

  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  detailAccounts : DetailAccountModel[];

  constructor(data?: Partial<HeaderAccountModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.rootAccountId
  }
}
