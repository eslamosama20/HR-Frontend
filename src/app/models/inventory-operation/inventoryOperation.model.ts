import {EntityBase} from '../base/entity-base';
import { SupplierDetailsModel } from '../inventory/supplierDetails.model';
import { InventoryPermitModel } from '../permits/inventory-permit.model';
import {PurchaseInvoice} from "../purchaseInvoice/purchaseInvoice";
import {PurchaseReturn} from "../purchaseReturn/purchaseReturn";
import {OperationEntryModel} from "./operationEntry.model";

export class InventoryOperationModel extends EntityBase {

  referenceNumber: string;
  description: string;
  operationDate: Date | string;
  operationSource: string;

  transactionId?: string;

  inventoryPermitId?: string;
  inventoryPermit: InventoryPermitModel;

  purchaseInvoiceId?: string;
  purchaseInvoice: PurchaseInvoice;

  purchaseReturnId?: string;
  purchaseReturn: PurchaseReturn;

  supplierDetailsId?: string;
  supplierDetails: SupplierDetailsModel;

  operationEntries: OperationEntryModel[];

  constructor(data?: Partial<InventoryOperationModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
  }
}
