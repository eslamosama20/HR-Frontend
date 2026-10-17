import { EntityBase } from '../base/entity-base';

export class EmploymentApplicationModel extends EntityBase {
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  applicantIdNumber?: string;
  position: string;
  department?: string;
  applicationDate: Date | string;
  status: number;
  expectedSalary?: number;
  experience?: string;
  education?: string;
  notes?: string;
  expirationDate?: Date | string;
  preReminderDays?: number;
  isCritical?: boolean;
  attachmentId?: string;

  constructor(data?: Partial<EmploymentApplicationModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
    this.preReminderDays = this.preReminderDays ?? 14;
    this.isCritical = this.isCritical ?? false;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.applicantName
      && !!this.position
      && !!this.applicationDate;
  }
}
