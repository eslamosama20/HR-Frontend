import { PublicHotelPaidServiceModel } from '../public-booking/public-paid-service.model';

export interface PublicHotelModel {
  id: string;
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
  roomTypes?: PublicRoomTypeModel[];
  averageRating?: number;
  reviewCount?: number;
  paidServices?: PublicHotelPaidServiceModel[];
}

export interface PublicRoomTypeModel {
  id: string;
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
  totalRooms: number;
  availableQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  erpRoomTypeId?: string;
  hotel?: PublicHotelModel;
}

export interface HotelSearchFilters {
  city?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  numberOfGuests?: number;
  numberOfRooms?: number;
  minPrice?: number;
  maxPrice?: number;
  stars?: number;
  amenities?: string[];
  sortBy?: 'price' | 'stars' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface RoomAvailability {
  roomTypeId: string;
  availableQuantity: number;
  pricePerNight: number;
  totalPrice: number;
  isAvailable: boolean;
}
