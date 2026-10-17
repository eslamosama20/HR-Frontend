import { EntityBase } from '../base/entity-base';

/**
 * يمثل غرفة فردية ضمن نوع الغرف (Room Type)
 * كل غرفة لها رقم فريد، إطلالة، وسعر إضافي للإطلالة
 */
export class PublicRoomInventoryModel extends EntityBase {
  roomTypeId: string; // معرف نوع الغرفة
  roomNumber: string; // رقم الغرفة (مثل: 101, 102, 201)
  viewType?: string; // نوع الإطلالة (Sea View, City View, Garden View)
  viewPrice?: number; // السعر الإضافي للإطلالة
  isAvailable: boolean; // هل الغرفة متاحة للحجز
  notes?: string; // ملاحظات إضافية

  constructor(data?: Partial<PublicRoomInventoryModel>) {
    super(data);
    this.isAvailable = true;
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.roomTypeId && !!this.roomNumber;
  }
}

export interface PublicRoomInventoryPostModel {
  roomTypeId: string;
  roomNumber: string;
  viewType?: string;
  viewPrice?: number;
  isAvailable: boolean;
  notes?: string;
}

export interface PublicRoomInventoryPutModel extends PublicRoomInventoryPostModel {
  id: string;
}

export interface PublicRoomInventoryFiltersModel {
  roomTypeId?: string;
  roomNumber?: string;
  viewType?: string;
  isAvailable?: boolean;
}
