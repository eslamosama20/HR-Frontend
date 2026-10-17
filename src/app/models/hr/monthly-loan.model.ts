import {EntityBase} from '../base/entity-base';
import {EmployeeModel} from "./employee.model";

export class MonthlyLoanModel extends EntityBase {

  employeeId: string;
  employee: EmployeeModel;
  employeeDeviceId?: string;
  date: Date | string;
  amount: number;
  reason?: string;


  constructor(data?: Partial<MonthlyLoanModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.date
      && !!this.amount
  }
}
