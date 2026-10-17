import {EntityBase} from '../base/entity-base';
import { ClientProfileModel } from '../accounting/clientProfile.model';
import {MeasurementUnitModel} from "../inventory/measurementUnit.model";
import {StoreDetailsModel} from "../inventory/storeDetails.model";

export class MainSalesClassModel extends EntityBase {

  englishName: string;
  arabicName: string;
  referenceCode : string;
  detailSalesClassId: string;

  clientProfileId: string;
  clientProfile: ClientProfileModel;

  icon: string;

  isTaxExempted: boolean = false;

  classType: "Direct" | "Compound"

  measurementUnitId: string;
  measurementUnit: MeasurementUnitModel;

  productUnitsCount: number;
  isReservationItem: boolean = false;


  constructor(data?: Partial<MainSalesClassModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.detailSalesClassId
      && !!this.measurementUnitId
      && !!this.isTaxExempted
  }
}
