import { EntityBase } from '../base/entity-base';
import { EmployeeModel } from './employee.model';

export class ResignationRequestModel extends EntityBase {
  employeeId: string;
  employee?: EmployeeModel;
  requestDate: Date | string;
  lastWorkingDay: Date | string;
  reason?: string;
  status: string;
  approvedById?: string;
  approvedBy?: EmployeeModel;
  approvedAt?: Date | string;
  notes?: string;
  attachmentPath?: string;

  constructor(data?: Partial<ResignationRequestModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.lastWorkingDay;
  }
}
