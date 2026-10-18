import {EntityBase} from '../base/entity-base';

export class Factory3PaymentResultModel  {

  employeeId: number;
  deviceId?: string;
  employeeName: string;
  employeeTypeName: string;
  workshop?: string;
  department?: string;
  jobTitle?: string;

  monthlyRate: number;
  supplementaryRate: number;
  livingAllowance?: number;
  mealAllowance?: number;
  transportAllowance?: number;
  housingAllowance?: number;
  extraIncrease?: number;
  supervisionBonus?: number;
  masteryBonus?: number;
  regularityBonus?: number;
  otherAllowances?: number;

  totalBonuses: number;
  totalSalary: number;
  overtimeBaseSalary?: number;

  absentDaysCount: number;
  dailyRate: number;
  totalAbsentPenalty: number;
  regularityDeduction?: number;

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
