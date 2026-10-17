import {EntityBase} from '../base/entity-base';
import {BranchStatusModel} from "./branchStatus.model";


export class BranchDetailsModel extends EntityBase {
  arabicName: string;
  englishName: string;
  address: string | { street: string, city: string, country: string, zipCode: string, fullAddress: string };
  street: string;
  city: string;
  country: string;
  zipCode: string;
  email: string;
  branchStatus?: BranchStatusModel;
  branchStatusId: string;
  companyDetailsId: string;

  phone: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  taxNumber: string;

  constructor(data?: Partial<BranchDetailsModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
      if (typeof data.address === "object" ){
        this.street = data?.address?.street;
        this.city = data?.address?.city;
        this.country = data?.address?.country;
        this.zipCode = data?.address?.zipCode;
      }
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
      && !!this.englishName
      && !!this.companyDetailsId
  }
}
