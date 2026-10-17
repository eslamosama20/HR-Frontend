import {EntityBase} from '../base/entity-base';

export class EmploymentTypeModel extends EntityBase {

  code: string;
  description: string;
  weeklyDayOff: string;

  get weeklyDayOffValues(): string[] {
    if (this.weeklyDayOff) {
      const dayOff = this.weeklyDayOff.split(',');
      if (dayOff.length > 0) {
        return dayOff.map(x => x.trim());
      }
    }
    return [];
  }
  constructor(data?: Partial<EmploymentTypeModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.code
  }
}
