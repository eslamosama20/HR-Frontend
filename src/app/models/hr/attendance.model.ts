import {EntityBase} from '../base/entity-base';
import {EmployeeModel} from "./employee.model";

export class AttendanceModel extends EntityBase {

  employeeId: string;
  employee: EmployeeModel;
  employeeName?: string;
  employeeDeviceId?: string;
  attendanceDate: string | Date;
  attendanceFlag: "Present" | "LateEntry" | "LateWithPermission" | "EarlyExit" | "Absent" | "Holiday" | "OnLeaveWithPermission" | "OnLeaveWithoutPermission" | "Weekend" | "HalfDay" ;
  attendanceFlagArabic?: string;
  reason?: string;

  constructor(data?: Partial<AttendanceModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.attendanceDate
      && !!this.attendanceFlag
  }
}
