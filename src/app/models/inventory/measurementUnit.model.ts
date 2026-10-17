import {EntityBase} from '../base/entity-base';

export class MeasurementUnitModel extends EntityBase {
  arabicName: string;
  englishName: string;
  arabicSymbol: string;
  englishSymbol: string;


  constructor(data?: Partial<MeasurementUnitModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
      && !!this.englishName
      && !!this.arabicSymbol
      && !!this.englishSymbol;
  }
}
