import { EntityBase } from '../base/entity-base';
import { PublicHotelPaidServiceModel } from './public-paid-service.model';

export class PublicHotelModel extends EntityBase {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  address?: string;
  addressAr?: string;
  city?: string;
  country?: string;
  stars: number;
  phone?: string;
  email?: string;
  website?: string;
  mainImageUrl?: string;
  mainImagePublicId?: string;
  additionalImageUrls?: string; // JSON array of Cloudinary URLs
  amenities?: string; // JSON array
  checkInTime?: string;
  checkOutTime?: string;
  latitude?: number;
  longitude?: number;
  policies?: string;
  isFeatured: boolean;
  erpHotelId?: string;
  roomTypesCount?: number;
  bookingsCount?: number;
  paidServices?: PublicHotelPaidServiceModel[];

  constructor(data?: Partial<PublicHotelModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.name && this.stars >= 0 && this.stars <= 5;
  }
}

export interface PublicHotelPostModel {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  address?: string;
  addressAr?: string;
  city?: string;
  country?: string;
  stars: number;
  phone?: string;
  email?: string;
  website?: string;
  mainImageUrl?: string;
  mainImagePublicId?: string;
  additionalImageUrls?: string;
  amenities?: string;
  checkInTime?: string;
  checkOutTime?: string;
  latitude?: number;
  longitude?: number;
  policies?: string;
  isActive: boolean;
  isFeatured: boolean;
  erpHotelId?: string;
  paidServices?: PublicHotelPaidServiceModel[];
}

export interface PublicHotelPutModel extends PublicHotelPostModel {
  id: string;
}

export interface PublicHotelFiltersModel {
  name?: string;
  city?: string;
  country?: string;
  minStars?: number;
  maxStars?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  amenities?: string;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusInKm?: number;
  checkIn?: Date;
  checkOut?: Date;
  guestsCount?: number;
}
