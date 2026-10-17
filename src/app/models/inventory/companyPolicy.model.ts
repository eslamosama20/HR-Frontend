import { EntityBase } from '../base/entity-base';

export class CompanyPolicyModel extends EntityBase {
  policyParagraph: string;
  isPrimary: boolean;

  constructor(data?: Partial<CompanyPolicyModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.policyParagraph;
  }
}
