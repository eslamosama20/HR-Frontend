import {EntityBase} from '../base/entity-base';
import { HeaderSalesClassModel } from './headerSalesClass.model';

export class RootSalesClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  headerSalesClasses: HeaderSalesClassModel[];

  icon: string;
  constructor(data?: Partial<RootSalesClassModel>) {
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
