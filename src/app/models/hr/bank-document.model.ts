import { EntityBase } from '../base/entity-base';
import { EmployeeModel } from './employee.model';

export class BankDocumentModel extends EntityBase {
  employeeId: string;
  employee?: EmployeeModel;
  bankName: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: Date | string;
  expirationDate?: Date | string;
  notes?: string;
  attachmentPath?: string;

  constructor(data?: Partial<BankDocumentModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.employeeId
      && !!this.bankName
      && !!this.documentType;
  }
}
