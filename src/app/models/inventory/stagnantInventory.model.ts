import { EntityBase } from '../base/entity-base';

export enum StagnantReason {
  Manual = 0,
  AutoByPeriod = 1,
  OnEntryPermit = 2
}

export class StagnantInventoryModel extends EntityBase {
  mainPurchaseClassId?: string;
  mainPurchaseClassName?: string;
  productCode?: string;
  mainSalesClassId?: string;
  mainSalesClassName?: string;
  quantity: number = 0;
  lastMovementDate?: Date | string;
  addedToStagnantDate?: Date | string;
  reason: StagnantReason = StagnantReason.Manual;
  reasonDisplay?: string;
  stagnantPeriodMonths?: number;
  isAutoAdded: boolean = false;
  notes?: string;
  addedBy?: string;
  storeDetailsId?: string;
  storeName?: string;
  batchNo?: string | null;
  isDisposed: boolean = false;
  disposedDate?: Date | string;
  disposalMethod?: string;

  get productName(): string {
    return this.mainPurchaseClassName || this.mainSalesClassName || '';
  }

  constructor(data?: Partial<StagnantInventoryModel>) {
    // Remove productName from data since it's a getter-only property
    const { productName, ...cleanData } = (data || {}) as any;
    super(cleanData);
    
    if (data) {
      Object.assign(this, cleanData);
      if (data.lastMovementDate && typeof data.lastMovementDate === 'string') {
        this.lastMovementDate = new Date(data.lastMovementDate);
      }
      if (data.addedToStagnantDate && typeof data.addedToStagnantDate === 'string') {
        this.addedToStagnantDate = new Date(data.addedToStagnantDate);
      }
      if (data.disposedDate && typeof data.disposedDate === 'string') {
        this.disposedDate = new Date(data.disposedDate);
      }
    }
  }

  override validate(): boolean {
    return super.validate()
      && (!!this.mainPurchaseClassId || !!this.mainSalesClassId)
      && this.quantity > 0;
  }

  getReasonDisplay(): string {
    switch (this.reason) {
      case StagnantReason.Manual:
        return 'يدوي';
      case StagnantReason.AutoByPeriod:
        return 'تلقائي بالفترة';
      case StagnantReason.OnEntryPermit:
        return 'عند إذن الدخول';
      default:
        return 'غير محدد';
    }
  }

  getStagnantDays(): number {
    if (!this.lastMovementDate) return 0;
    const lastMove = new Date(this.lastMovementDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastMove.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
