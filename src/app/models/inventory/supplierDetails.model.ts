import { EntityBase } from '../base/entity-base';
import { SupplierStatusModel } from "./supplierStatus.model";
import { AddressModel } from '../../modules/auth/models/address.model';
import {MainAccountModel} from "../accounting/mainAccount.model";


export function parseSupplierAddress(address: any): { street: string; city: string; country: string; zipCode: string } {
  if (!address) {
    return { street: '', city: '', country: '', zipCode: '' };
  }

  let addr = address;
  while (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      if (parsed === addr) break;
      addr = parsed;
    } catch {
      break;
    }
  }

  if (typeof addr === 'object' && addr !== null) {
    return {
      street: addr.street || '',
      city: addr.city || '',
      country: addr.country || '',
      zipCode: addr.zipCode || addr.postalCode || ''
    };
  }

  if (typeof address === 'string') {
    if (!address.includes('{') && !address.includes('}')) {
      const parts = address.split(',').map(s => s.trim());

      if (parts.length >= 4 && !parts[0] && !parts[1]) {
        const countryParts = parts.slice(2).filter(p => !!p);
        if (countryParts.length > 0) {
          let zip = '';
          if (countryParts.length > 1) {
            const last = countryParts[countryParts.length - 1];
            if (/^\d{1,10}$/.test(last)) {
              zip = countryParts.pop() || '';
            }
          }
          return {
            street: '',
            city: '',
            country: countryParts.join(' - '),
            zipCode: zip
          };
        }
      }

      const nonEmptyParts = parts.filter(p => p !== '');
      if (parts.length >= 4) {
        const country = parts[2] || (nonEmptyParts.length > 0 ? nonEmptyParts[nonEmptyParts.length - 1] : '');
        return {
          street: parts[0] || '',
          city: parts[1] || '',
          country: country,
          zipCode: parts[3] || ''
        };
      } else if (nonEmptyParts.length === 3) {
        return {
          street: nonEmptyParts[0],
          city: nonEmptyParts[1],
          country: nonEmptyParts[2],
          zipCode: ''
        };
      } else if (nonEmptyParts.length === 2) {
        return {
          street: nonEmptyParts[0],
          city: '',
          country: nonEmptyParts[1],
          zipCode: ''
        };
      } else if (nonEmptyParts.length === 1) {
        return {
          street: '',
          city: '',
          country: nonEmptyParts[0],
          zipCode: ''
        };
      }
    }
  }

  return { street: '', city: '', country: '', zipCode: '' };
}

export class SupplierDetailsModel extends EntityBase {
  arabicName: string;
  englishName: string;
  address: { street: string, city: string, country: string, zipCode: string, fullAddress: string } | any;
  street: string;
  city: string;
  country: string;
  zipCode: string;
  contactNumber: string;
  email: string;

  bankName: string;
  bankAccountNumber: string;
  iban: string;
  taxNumber: string;
  additionalContactNumber?: string;
  district?: string;
  shortAddress?: string;
  buildingNumber?: string;
  postalCode?: string;
  fax?: string;
  website?: string;
  instructions?: string;
  gaztNumber?: string;
  otherId?: string;

  supplierStatus?: SupplierStatusModel;
  supplierStatusId: string;

  mainAccountId: string;
  mainAccount: MainAccountModel;
  isFrontal: boolean = false;

  constructor(data?: Partial<SupplierDetailsModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
      const parsed = parseSupplierAddress(data.address);
      this.street = data.street !== undefined && data.street !== null ? data.street : (parsed.street || this.street || '');
      this.city = data.city !== undefined && data.city !== null ? data.city : (parsed.city || this.city || '');
      this.country = data.country !== undefined && data.country !== null ? data.country : (parsed.country || this.country || '');
      this.zipCode = data.zipCode !== undefined && data.zipCode !== null ? data.zipCode : (parsed.zipCode || this.zipCode || '');
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.arabicName
      && (!this.contactNumber || /^[0-9]*$/.test(this.contactNumber))
  }
  getFullAddress(): string {
    return `${this.address?.fullAddress || ''}`;
  }

  override toJSON(): any {
    // Build a fresh address string from the current (updated) fields
    // so that country changes are persisted correctly in the backend.
    const street = this.street ?? '';
    const city = this.city ?? '';
    const country = this.country ?? '';
    const zipCode = this.zipCode ?? this.postalCode ?? '';
    const addressStr = `${street}, ${city}, ${country}, ${zipCode}`;

    const payload: any = {
      arabicName: this.arabicName ?? null,
      englishName: this.englishName ?? null,
      address: addressStr,
      contactNumber: this.contactNumber ?? null,
      email: this.email ?? null,
      bankName: this.bankName ?? null,
      bankAccountNumber: this.bankAccountNumber ?? null,
      iban: this.iban ?? null,
      taxNumber: this.taxNumber ?? null,
      additionalContactNumber: this.additionalContactNumber ?? null,
      district: this.district ?? null,
      shortAddress: this.shortAddress ?? null,
      buildingNumber: this.buildingNumber ?? null,
      postalCode: this.postalCode ?? null,
      fax: this.fax ?? null,
      website: this.website ?? null,
      instructions: this.instructions ?? null,
      gaztNumber: this.gaztNumber ?? null,
      otherId: this.otherId ?? null,
      supplierStatusId: this.supplierStatusId ?? null,
      mainAccountId: this.mainAccountId ?? null,
      country: country || null,
      isActive: this.isActive ?? true,
      isFrontal: this.isFrontal ?? false,
    };

    if (this.id) {
      payload.id = this.id;
    }

    return payload;
  }
}
