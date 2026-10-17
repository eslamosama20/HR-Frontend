import { EntityBase } from '../base/entity-base';
import { PublicBookingPaidServiceModel } from './public-paid-service.model';

export enum BookingStatus {
  Pending = 0,
  Confirmed = 1,
  CheckedIn = 2,
  CheckedOut = 3,
  Cancelled = 4,
  NoShow = 5
}

export enum PaymentStatus {
  Pending = 0,
  Paid = 1,
  PartiallyPaid = 2,
  Refunded = 3,
  Failed = 4
}

export interface BookingRoomModel {
  roomTypeId: string;
  roomTypeName?: string;
  quantity: number;
  pricePerNight: number;
  totalPrice?: number;
}

export class PublicBookingModel extends EntityBase {
  hotelId: string;
  hotelName: string;
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNationality?: string;
  numberOfAdults: number;
  numberOfChildren: number;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  specialRequests?: string;
  rooms: BookingRoomModel[];
  paidServices?: PublicBookingPaidServiceModel[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  promoCode?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  paymentDetails?: string;
  paymobOrderId?: number;
  paymentDate?: Date;
  cancellationReason?: string;
  cancellationDate?: Date;
  erpReservationId?: string;

  constructor(data?: Partial<PublicBookingModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
      if (data.checkInDate) this.checkInDate = new Date(data.checkInDate);
      if (data.checkOutDate) this.checkOutDate = new Date(data.checkOutDate);
      if (data.paymentDate) this.paymentDate = new Date(data.paymentDate);
      if (data.cancellationDate) this.cancellationDate = new Date(data.cancellationDate);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.hotelId && !!this.guestName && !!this.guestEmail && this.numberOfAdults > 0;
  }
}

export interface PublicBookingPostModel {
  hotelId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNationality?: string;
  numberOfAdults: number;
  numberOfChildren: number;
  checkInDate: Date;
  checkOutDate: Date;
  specialRequests?: string;
  rooms: BookingRoomModel[];
  paidServices?: PublicBookingPaidServiceModel[];
  totalAmount: number;
  discountAmount: number;
  promoCode?: string;
  paymentMethod?: string;
  transactionId?: string;
  paymentDetails?: string;
  paymobOrderId?: number;
  erpReservationId?: string;
}

export interface PublicBookingFiltersModel {
  hotelId?: string;
  bookingReference?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  checkInFrom?: Date;
  checkInTo?: Date;
  checkOutFrom?: Date;
  checkOutTo?: Date;
  bookingDateFrom?: Date;
  bookingDateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  erpReservationId?: string;
}
