import {MainSalesClassModel} from "../sales-classes-tree/mainSalesClass.model";


export class SalesItem {
  id?: number;
  itemNo?: string;
  mainSalesClassId!: string;
  mainSalesClass?: MainSalesClassModel;
  price!: number;
  quantity!: number;
  noOfNights?:number = 1;
  tax!: number;
  taxAmount!: number;  // Required decimal field
  discount!: number;  // Required decimal field
  discountAmount!: number;  // Required decimal field
  totalPrice!: number;  // Required decimal field
  netPrice!: number;  // Required decimal field
  saleInvoiceId!: number;
  storeDetailsId?: string | null;
  availableQuantity?: number | null;
  returnedQuantity?: number;
}
