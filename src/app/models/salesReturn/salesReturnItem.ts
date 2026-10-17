import {MainSalesClassModel} from "../sales-classes-tree/mainSalesClass.model";
import {PurchaseReturnItem} from "../purchaseReturn/purchaseReturnItem";


export class SalesReturnItem {
  id?: number;
  itemNo?: string;
  mainSalesClassId!: string;
  mainSalesClass?: MainSalesClassModel;
  price!: number;
  quantity!: number;
  tax!: number;
  taxAmount!: number;  // Required decimal field
  discount!: number;  // Required decimal field
  discountAmount!: number;  // Required decimal field
  totalPrice!: number;  // Required decimal field
  netPrice!: number;  // Required decimal field
  salesReturnId!: number;
}

