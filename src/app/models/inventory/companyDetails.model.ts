import { EntityBase } from '../base/entity-base';
import { CompanyStatusModel } from "./companyStatus.model";
import { BranchDetailsModel } from "./branchDetails.model";
import { CompanyPhoneModel } from "./companyPhone.model";
import { BankAccountModel } from "./bankAccount.model";
import { CompanyPolicyModel } from "./companyPolicy.model";


export class CompanyDetailsModel extends EntityBase {
  arabicName: string;
  englishName: string;
  address: { street: string, city: string, country: string, zipCode: string, fullAddress: string } | any;
  arabicAddress: { street: string, city: string, country: string, zipCode: string, fullAddress: string } | any;
  street: string;
  city: string;
  country: string;
  zipCode: string;
  shortAddress: string;
  buildingNumber: string;
  subNumber: string;
  district: string;
  englishDistrict: string;
  email: string;
  companyStatus?: CompanyStatusModel;
  companyStatusId: string;
  branchDetails: BranchDetailsModel[];
  
  phones: CompanyPhoneModel[];
  bankAccounts: BankAccountModel[];
  policies: CompanyPolicyModel[];
  
  isZatcaIntegrated: boolean;
  phone: string;
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  bankBranchName : string;
  swiftCode : string;
  iban: string;
  taxNumber: string;
  gaztNumber: string;
  businessCategory: string;
  isOnBoarded: boolean;
  logoUrl?: string;
  stampUrl?: string;
  website: string;
  unifiedNumber: string;
  registrationNumber: string;
  policyParagraph: string;
  constructor(data?: Partial<CompanyDetailsModel>) {
    super(data);
    this.phones = [];
    this.bankAccounts = [];
    this.policies = [];
    
    if (data) {
      Object.assign(this, data);
      if (typeof data.address === "object" ){
        this.street = data?.address?.street;
        this.city = data?.address?.city;
        this.country = data?.address?.country;
        this.zipCode = data?.address?.zipCode;
      }
      if (typeof data.arabicAddress === "object" ){
        this.street = data?.arabicAddress?.street;
        this.city = data?.arabicAddress?.city;
        this.country = data?.arabicAddress?.country;
        this.zipCode = data?.arabicAddress?.zipCode;
      }
      
      if (data.phones && Array.isArray(data.phones)) {
        this.phones = data.phones.map(phone => new CompanyPhoneModel(phone));
        // Fallback: if phone field is empty, use first phone from phones array
        if (!this.phone && this.phones.length > 0) {
          const primary = this.phones.find(p => p.isPrimary) || this.phones[0];
          this.phone = primary.phoneNumber;
        }
      }
      
      if (data.bankAccounts && Array.isArray(data.bankAccounts)) {
        this.bankAccounts = data.bankAccounts.map(account => new BankAccountModel(account));
      }
      
      if (data.policies && Array.isArray(data.policies)) {
        this.policies = data.policies.map(policy => new CompanyPolicyModel(policy));
      }
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
      && !!this.englishName
      && !!this.taxNumber
      && !!this.gaztNumber
  }

  getFullAddress(): string {
    if (!this.address?.fullAddress) {
      const parts = [this.country, this.city, this.street, this.zipCode].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '';
    }
    return `${this.address.fullAddress}`;
  }

  getFullArabicAddress(): string {
    if (!this.arabicAddress?.fullAddress) {
      const parts = [this.country, this.city, this.street, this.zipCode].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '';
    }
    return `${this.arabicAddress.fullAddress}`;
  }
}
