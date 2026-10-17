import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from '../accounting/clientProfile.model';
import { DetailPurchaseClassModel } from './detailPurchaseClass.model';
import { RootPurchaseClassModel } from './rootPurchaseClass.model';

export class HeaderPurchaseClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;

  rootPurchaseClassId: string;

  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  detailPurchaseClasses : DetailPurchaseClassModel[];

  constructor(data?: Partial<HeaderPurchaseClassModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.rootPurchaseClassId
  }
}
