import { EntityBase } from "../base/entity-base";

export class RoomTypeModel extends EntityBase {

  englishName: string;
  arabicName: string;
  personNo: number;
  isFrontal: boolean;
  salesClassId?: string;
  availableQuantity?: number;
  logoUrl?: string;
  logoPublicId?: string;
  // JSON array of Cloudinary URLs for room gallery
  imageUrls?: string;

  constructor(data?: Partial<RoomTypeModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName

  }
}
