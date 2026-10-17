import {EntityBase} from '../base/entity-base';
import {Factory1PaymentResultModel} from "./factory1-payment-result.model";
import { Factory2PaymentResultModel } from './factory2-payment-result.model';
import { Factory3PaymentResultModel } from './factory3-payment-result.model';

export class PaymentResultModel  {

  factory1Payments: Factory1PaymentResultModel[];
  factory2Payments: Factory2PaymentResultModel[];
  factory3Payments: Factory3PaymentResultModel[];

  constructor(data?: Partial<PaymentResultModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }

}
