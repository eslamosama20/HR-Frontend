import {EntityBase} from '../base/entity-base';

export class ShiftModel extends EntityBase {

  referenceNumber: string = '';
  name: string;
  startTime: string | Date;
  endTime: string | Date;
  gracePeriodInMinutes: number;

  constructor(data?: Partial<ShiftModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.name
      && !!this.startTime
      && !!this.endTime
  }
}
