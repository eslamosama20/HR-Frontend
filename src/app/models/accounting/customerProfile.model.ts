import {EntityBase} from '../base/entity-base';
import {MainAccountModel} from "./mainAccount.model";

export interface CustomerDepartmentModel {
  id?: string;
  nameAr: string;
  nameEn?: string;
}

export class CustomerProfileModel extends EntityBase {

  englishName: string;
  arabicName: string;
  contactNumber: string;
  email: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  taxNumber: string;
  street: string;
  englishStreet: string;
  district: string;
  englishDistrict: string;
  shortAddress: string;
  buildingNumber: string;
  subNumber: string;
  postalCode: string;
  city: string;
  englishCity: string;
  country: string;
  englishCountry: string;
  additionalContactNumber: string;
  fax: string;
  website: string;
  instructions: string;
  gaztNumber: string;
  otherId: string;
  mainAccountId: string;
  mainAccount: MainAccountModel;
  isFrontal: boolean = false;
  isReservationCompany: boolean = false;
  isForProjects: boolean = false;
  departments: CustomerDepartmentModel[] = [];
  constructor(data?: Partial<CustomerProfileModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName
      && !!this.taxNumber
  }

  override toJSON(): any {
    const payload: any = {
      arabicName: this.arabicName ?? null,
      englishName: this.englishName ?? null,
      taxNumber: this.taxNumber ?? null,
      contactNumber: this.contactNumber ?? null,
      email: this.email ?? null,
      bankName: this.bankName ?? null,
      bankAccountNumber: this.bankAccountNumber ?? null,
      iban: this.iban ?? null,
      street: this.street ?? null,
      englishStreet: this.englishStreet ?? null,
      district: this.district ?? null,
      englishDistrict: this.englishDistrict ?? null,
      shortAddress: this.shortAddress ?? null,
      buildingNumber: this.buildingNumber ?? null,
      subNumber: this.subNumber ?? null,
      postalCode: this.postalCode ?? null,
      city: this.city ?? null,
      englishCity: this.englishCity ?? null,
      country: this.country ?? null,
      englishCountry: this.englishCountry ?? null,
      additionalContactNumber: this.additionalContactNumber ?? null,
      fax: this.fax ?? null,
      website: this.website ?? null,
      instructions: this.instructions ?? null,
      gaztNumber: this.gaztNumber ?? null,
      otherId: this.otherId ?? null,
      mainAccountId: this.mainAccountId ?? null,
      isActive: this.isActive ?? true,
      isFrontal: this.isFrontal ?? false,
      isReservationCompany: this.isReservationCompany ?? false,
      isForProjects: this.isForProjects ?? false,
      departments: this.departments ?? [],
    };

    // Include id only for PUT (update) requests
    if (this.id) {
      payload.id = this.id;
    }

    return payload;
  }
}
