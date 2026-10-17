import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from '../accounting/clientProfile.model';
import { HeaderPurchaseClassModel } from './headerPurchaseClass.model';
import { MainPurchaseClassModel } from './mainPurchaseClass.model';
import { RootPurchaseClassModel } from './rootPurchaseClass.model';

export class DetailPurchaseClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  headerPurchaseClassId: string;

  mainPurchaseClasses: MainPurchaseClassModel[];
  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  constructor(data?: Partial<DetailPurchaseClassModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.headerPurchaseClassId
  }
}
