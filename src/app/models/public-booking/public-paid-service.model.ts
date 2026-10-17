import { EntityBase } from '../base/entity-base';

export class PublicPaidServiceModel extends EntityBase {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  icon?: string;
  serviceTypeCode?: string;
  displayOrder: number;

  constructor(data?: Partial<PublicPaidServiceModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.nameEn && !!this.nameAr;
  }
}

export interface PublicHotelPaidServiceModel {
  id?: string;
  publicPaidServiceId: string;
  price: number;
  isActive: boolean;
  notes?: string;
  service?: PublicPaidServiceModel;
}

export interface PublicBookingPaidServiceModel {
  id?: string;
  publicHotelPaidServiceId: string;
  priceAtBooking: number;
  quantity: number;
  customerNotes?: string;
  service?: PublicPaidServiceModel;
}
