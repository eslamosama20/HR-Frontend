import {EntityBase} from '../base/entity-base';
import { FactoryOvertimePaymentResultModel } from './factory-overtime-payment-result.model';

export class OvertimePaymentResultModel  {

  factory1OvertimePayments: FactoryOvertimePaymentResultModel[];
  factory2OvertimePayments: FactoryOvertimePaymentResultModel[];
  factory3OvertimePayments: FactoryOvertimePaymentResultModel[];

  constructor(data?: Partial<OvertimePaymentResultModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }

}
