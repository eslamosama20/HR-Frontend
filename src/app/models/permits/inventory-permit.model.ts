import { MainAccountModel } from "../accounting/mainAccount.model";
import {EntityBase} from "../base/entity-base";
import {InventoryPermitEntryModel} from "./inventory-permit-entry.model";
import {StoreDetailsModel} from "../inventory/storeDetails.model";
import {AttachmentModel} from "../Attachments/attachment.model";

// نوع التذكير
export type ReminderType = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export class InventoryPermitModel extends EntityBase {

  referenceNumber: string;
  description: string;
  permitDate:Date | string;
  permitType: "Entry" | "Exit";
  storeDetailsId: string;
  mainAccountId: string;
  shippingCost?: number;

  mainAccount: MainAccountModel;
  storeDetails: StoreDetailsModel;

  permitEntries: InventoryPermitEntryModel[];
  transactionId?:string;
  attachments: AttachmentModel[];

  // حقول التذكير بتاريخ الصلاحية
  reminderEnabled: boolean = false;
  reminderFrequency?: ReminderType;
  customReminderDays?: number;
  lastReminderDate?: Date | string;
  nextReminderDate?: Date | string;

  constructor(data?: Partial<InventoryPermitModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.permitDate
      && !!this.storeDetailsId
      && !!this.mainAccountId
      && !!this.permitType
  }
}
