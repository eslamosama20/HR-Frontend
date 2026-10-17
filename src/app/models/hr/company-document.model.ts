import { EntityBase } from '../base/entity-base';

export class CompanyDocumentModel extends EntityBase {
  referenceNumber?: string;
  documentName: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: Date | string;
  expirationDate: Date | string;
  issuingAuthority?: string;
  description?: string;
  status?: number;
  attachmentId?: string;
  preReminderDays: number;
  isCritical: boolean;
  daysUntilExpiration?: number;

  constructor(data?: Partial<CompanyDocumentModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
    this.preReminderDays = this.preReminderDays || 30;
    this.isCritical = this.isCritical ?? true;
  }

  override validate(): boolean {
    return super.validate()
      && !!this.documentName
      && !!this.documentType
      && !!this.expirationDate;
  }
}
