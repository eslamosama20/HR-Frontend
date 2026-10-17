import { EntityBase } from "../base/entity-base";
import {MainAccountModel} from "./mainAccount.model";

export class ReservationSupplierModel extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;

  mainAccountId?: string;
  detailAccountId?: string;
  mainAccount: MainAccountModel;
  reservationNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  linkedReceiptId?: string;
  contactNumber?: string;       
  additionalContactNumber?: string;
  email?: string;              
  bankName?: string;           
  bankAccountNumber?: string;  
  iban?: string;               
  taxNumber?: string;  
  street?: string;
  district?: string;
  buildingNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  shortAddress?: string;
  subNumber?: string;
  fax?: string;
  website?: string;
  instructions?: string;
  gaztNumber?: string;
  otherId?: string;

  constructor(data?: Partial<ReservationSupplierModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName

  }
}
