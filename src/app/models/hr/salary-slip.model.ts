import { EntityBase } from '../base/entity-base';
import { EmployeeModel } from './employee.model';

export class SalarySlipModel extends EntityBase {
  employeeId: string;
  employee?: EmployeeModel;
  month: number;
  year: number;
  basicSalary: number;
  allowances?: number;
  deductions?: number;
  netSalary: number;
  isPaid: boolean;
  paidDate?: Date | string;
  notes?: string;
  attachmentPath?: string;

  constructor(data?: Partial<SalarySlipModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
    this.isPaid = this.isPaid ?? false;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.month
      && !!this.year
      && !!this.basicSalary
      && !!this.netSalary;
  }
}
