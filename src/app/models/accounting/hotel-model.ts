import { EntityBase } from "../base/entity-base";
import { DetailAccountModel } from "./detailAccount.model";
import { MainAccountModel } from "./mainAccount.model";

export class HotelModel extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;
  logoUrl?: string;
  logoPublicId?: string;

  mainAccountId?: string;
  mainAccount: MainAccountModel;
  contactNumber?: string;       
  email?: string;              
  bankName?: string;          
  bankAccountNumber?: string;   
  iban?: string;               
  taxNumber?: string; 
  street?: string;
  district?: string;
  city?: string;
  country?: string;
  shortAddress?: string;
  buildingNumber?: string;
  postalCode?: string;
  website?: string;
  additionalContactNumber?: string;
  fax?: string;
  gaztNumber?: string;
  constructor(data?: Partial<HotelModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
  }
}
