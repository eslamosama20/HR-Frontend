import { EntityBase } from '../base/entity-base';

export class PublicRoomTypeModel extends EntityBase {
  hotelId: string;
  hotelName: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  sizeInSqMeters?: number;
  maxGuests: number;
  numberOfBeds: number;
  bedType?: string;
  basePrice: number;
  weekendPrice?: number;
  mainImageUrl?: string;
  mainImagePublicId?: string;
  additionalImageUrls?: string; // JSON array of Cloudinary URLs
  amenities?: string; // JSON array
  viewType?: string;
  viewPrice?: number; // Additional price for the view type
  municipalityTaxPercentage?: number; // Municipality tax percentage (e.g., 5 for 5%)
  cancellationPolicy?: string; // Cancellation policy text
  cancellationPolicyAr?: string; // Cancellation policy in Arabic
  payAtHotel: boolean; // Allow payment at hotel
  payNow: boolean; // Allow online payment
  totalRooms: number;
  availableQuantity: number;
  erpRoomTypeId?: string;
  currentPrice?: number;

  constructor(data?: Partial<PublicRoomTypeModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.hotelId && !!this.name && this.maxGuests > 0 && this.basePrice >= 0;
  }
}

export interface PublicRoomTypePostModel {
  hotelId: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  sizeInSqMeters?: number;
  maxGuests: number;
  numberOfBeds: number;
  bedType?: string;
  basePrice: number;
  weekendPrice?: number;
  mainImageUrl?: string;
  mainImagePublicId?: string;
  additionalImageUrls?: string;
  amenities?: string;
  viewType?: string;
  viewPrice?: number;
  municipalityTaxPercentage?: number;
  cancellationPolicy?: string;
  cancellationPolicyAr?: string;
  payAtHotel: boolean;
  payNow: boolean;
  totalRooms: number;
  availableQuantity: number;
  isActive: boolean;
  erpRoomTypeId?: string;
}

export interface PublicRoomTypePutModel extends PublicRoomTypePostModel {
  id: string;
}

export interface PublicRoomTypeFiltersModel {
  hotelId?: string;
  name?: string;
  minGuests?: number;
  maxGuests?: number;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  viewType?: string;
  bedType?: string;
  amenities?: string;
  checkIn?: Date;
  checkOut?: Date;
  requiredRooms?: number;
}
