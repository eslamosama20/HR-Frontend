import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from '../accounting/clientProfile.model';
import { HeaderSalesClassModel } from './headerSalesClass.model';
import { MainSalesClassModel } from './mainSalesClass.model';
import { RootSalesClassModel } from './rootSalesClass.model';

export class DetailSalesClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  headerSalesClassId: string;

  mainSalesClasses: MainSalesClassModel[];
  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;
  isForProjects: boolean = false;

  constructor(data?: Partial<DetailSalesClassModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.headerSalesClassId
  }
}
