import {EntityBase} from '../base/entity-base';
import { HeaderPurchaseClassModel } from './headerPurchaseClass.model';

export class RootPurchaseClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  headerPurchaseClasses: HeaderPurchaseClassModel[];

  icon: string;
  constructor(data?: Partial<RootPurchaseClassModel>) {
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
