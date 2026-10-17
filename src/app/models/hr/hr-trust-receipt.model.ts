import { EntityBase } from '../base/entity-base';
import { EmployeeModel } from './employee.model';

export class HRTrustReceiptModel extends EntityBase {
  referenceNumber?: string;
  employeeId: string;
  employeeName?: string;
  employee?: EmployeeModel;
  itemDescription: string;
  itemSerialNumber?: string;
  itemValue?: number;
  receiveDate: Date | string;
  returnDate?: Date | string;
  isReturned: boolean;
  notes?: string;
  expirationDate?: Date | string;
  preReminderDays: number;
  isCritical: boolean;
  status?: number;
  attachmentId?: string;

  constructor(data?: Partial<HRTrustReceiptModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
    this.isReturned = this.isReturned ?? false;
    this.preReminderDays = this.preReminderDays ?? 7;
    this.isCritical = this.isCritical ?? false;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.itemDescription
      && !!this.receiveDate;
  }
}
