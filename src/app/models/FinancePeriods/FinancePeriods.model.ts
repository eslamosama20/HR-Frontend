import {EntityBase} from '../base/entity-base';
export class FinancePeriodsModel extends EntityBase {

    englishName: string;
    arabicName: string;
  
    constructor(data?: Partial<FinancePeriodsModel>) {
      super(data);
      if (data) {
        Object.assign(this, data);
      }
    }
}