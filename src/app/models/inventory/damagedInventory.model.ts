import { EntityBase } from '../base/entity-base';

export class DamagedInventoryModel extends EntityBase {
  productId!: string;
  productName?: string;
  productCode?: string;
  storeDetailsId!: string;
  storeName?: string;
  quantity!: number;
  damageDate!: Date;
  reason?: string;
  reportedBy?: string;
  unitName?: string;
  
  // حقول الصلاحية والموقع لتتبع الباتش الصحيح
  batchNo?: string | null;
  expiryDate?: Date | string | null;
  shelfNumber?: string;
  rowNumber?: string;
  
  // معرف إذن الخروج الذي تم إنشاؤه لخصم الكمية
  exitPermitId?: string;

  constructor(data?: Partial<DamagedInventoryModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
      if (data.damageDate && typeof data.damageDate === 'string') {
        this.damageDate = new Date(data.damageDate);
      }
      if (data.expiryDate && typeof data.expiryDate === 'string') {
        this.expiryDate = new Date(data.expiryDate);
      }
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.productId
      && !!this.storeDetailsId
      && this.quantity > 0
      && !!this.damageDate;
  }
}
