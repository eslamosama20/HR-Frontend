import {EntityBase} from '../base/entity-base';

export class Factory3PaymentResultModel  {

  employeeId: number;
  employeeName: string;
  employeeTypeName: string;
  monthlyRate: number;
  supplementaryRate: number;
  totalBonuses: number;
  totalSalary: number;
  absentDaysCount: number;
  dailyRate: number;
  totalAbsentPenalty: number;
  totalLateHours: number;
  hourlyRate: number;
  totalLateEntryPenalty: number;
  totalLoans: number;
  insurance: number;
  totalPenalties: number;
  totalSubtractedAmount: number;
  netPay: number;


  constructor(data?: Partial<Factory3PaymentResultModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }

}
