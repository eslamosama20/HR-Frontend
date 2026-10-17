import { EntityBase } from '../base/entity-base';
import { EmployeeModel } from './employee.model';

export class LeaveApplicationModel extends EntityBase {
  employeeId: string;
  employee?: EmployeeModel;
  employeeName?: string;
  leaveType: number;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  reason?: string;
  notes?: string;
  status: number;
  approverId?: string;
  approver?: EmployeeModel;
  approverName?: string;
  approvedAt?: Date | string;
  rejectionReason?: string;
  expirationDate?: Date | string;
  preReminderDays?: number;
  isCritical?: boolean;
  attachmentId?: string;

  constructor(data?: Partial<LeaveApplicationModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
    this.preReminderDays = this.preReminderDays ?? 3;
    this.isCritical = this.isCritical ?? false;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && this.leaveType !== undefined
      && !!this.startDate
      && !!this.endDate;
  }
}
