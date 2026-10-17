import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from '../accounting/clientProfile.model';
import { DetailSalesClassModel } from './detailSalesClass.model';
import { RootSalesClassModel } from './rootSalesClass.model';

export class HeaderSalesClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;

  rootSalesClassId: string;

  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  detailSalesClasses : DetailSalesClassModel[];

  constructor(data?: Partial<HeaderSalesClassModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.rootSalesClassId
  }
}
