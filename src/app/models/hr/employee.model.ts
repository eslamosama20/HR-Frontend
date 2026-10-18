import {EntityBase} from '../base/entity-base';
import {EmploymentTypeModel} from "./employment-type.model";
import {ShiftModel} from "./shift.model";
import {AttendanceModel} from "./attendance.model";

export class EmployeeModel extends EntityBase {

  referenceNumber: string = '';
  name: string;
  phone: string;
  employmentTypeId: string;
  employmentType: EmploymentTypeModel;
  shiftId: string;
  shift: ShiftModel;

  startDate: string;
  endDate?: string;

  attendanceRecords : AttendanceModel[];

  monthlyInsurance: number;
  leaveBalance: number;
  monthlyRate: number;
  supplementaryRate: number;
  overtimeRateMultiplier: number = 1.5;
  absentRateMultiplier: number = 1.5;
  lateRateMultiplier: number = 1.5;
  factoryType: "Factory1" | "Factory2" | "Factory3";
  remainingLeaveBalance: number;
  deviceId: string;

  // Falcon Factory Fields
  department?: string;
  workshop?: string;
  jobTitle?: string;
  nationalId?: string;
  address?: string;
  governorate?: string;
  birthDate?: string;
  insuranceNumber?: string;
  insuranceTitle?: string;

  // Allowances & Bonuses
  livingAllowance: number = 0;
  mealAllowance: number = 0;
  transportAllowance: number = 0;
  housingAllowance: number = 0;
  extraIncrease: number = 0;
  supervisionBonus: number = 0;
  masteryBonus: number = 0;
  regularityBonus: number = 0;

  totalGrossSalary?: number;
  overtimeBaseSalary?: number;

  constructor(data?: Partial<EmployeeModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.name
      && !!this.employmentTypeId
      && !!this.shiftId
      && !!this.startDate
  }
}
