import {EntityBase} from '../base/entity-base';

export class FactoryOvertimePaymentResultModel {

  employeeId: number;
  deviceId?: string;
  employeeName: string;
  employeeTypeName: string;
  monthlyRate: number;
  hourlyRate: number;
  overtimeHours: number;
  overtimePayment: number;
  constructor(data?: Partial<FactoryOvertimePaymentResultModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }

}
