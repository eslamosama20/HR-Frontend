import {EntityBase} from '../base/entity-base';
import {EmployeeModel} from "./employee.model";

export class CheckInLogModel extends EntityBase {

  employeeId: string;
  employee: EmployeeModel;
  employeeName?: string;
  employeeDeviceId?: string;
  time: string | Date;
  logType: "IN" | "OUT";
  logTypeArabic?: string;


  constructor(data?: Partial<CheckInLogModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.time
      && !!this.logType
  }
}
