import {MainPurchaseClassModel} from "../purchase-classes-tree/mainPurchaseClass.model";
import {StoreDetailsModel} from "../inventory/storeDetails.model";

export class PurchaseReturnItem {
  id?: number;
  itemNo?: string;
  mainPurchaseClassId!: string;
  mainPurchaseClass?: MainPurchaseClassModel;
  price!: number;           // Decimal in C# is number in TypeScript
  quantity!: number;        // Quantity is required (no ? indicates required)
  tax!: number;             // Required decimal
  taxAmount!: number;       // Required decimal
  discount!: number;        // Required decimal
  discountAmount!: number;  // Required decimal
  totalPrice!: number;      // Required decimal, net price after tax
  netPrice!: number;        // Required decimal, net price without tax
  purchaseReturnId!: number;  // Required integer
  storeDetailsId?: string;  // Guid? in C# is string | undefined in TypeScript
  storeDetails?: StoreDetailsModel;

}
