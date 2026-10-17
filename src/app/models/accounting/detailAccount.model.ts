import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from './clientProfile.model';
import { MainAccountModel } from './mainAccount.model';

export class DetailAccountModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  headerAccountId: string;

  mainAccounts: MainAccountModel[];
  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  constructor(data?: Partial<DetailAccountModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.headerAccountId
  }
}
