import { EntityBase } from '../base/entity-base';
import { EmployeeModel } from './employee.model';

export class InsuranceRecordModel extends EntityBase {
  employeeId: string;
  employee?: EmployeeModel;
  insuranceNumber: string;
  insuranceType: string;
  providerName?: string;
  startDate: Date | string;
  expirationDate: Date | string;
  coverageAmount?: number;
  premium?: number;
  notes?: string;
  attachmentPath?: string;
  preReminderDays: number;
  isCritical: boolean;
  daysUntilExpiration?: number;

  constructor(data?: Partial<InsuranceRecordModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
    this.preReminderDays = this.preReminderDays || 30;
    this.isCritical = this.isCritical ?? true;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.insuranceNumber
      && !!this.insuranceType
      && !!this.expirationDate;
  }
}
