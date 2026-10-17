import { CartItem } from './pos-invoice.model';

export interface CashierHeldOrderLineRequest {
  productId: string;
  productUnitId?: number | null;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  itemName: string;
  itemCode?: string;
}

export interface CashierHeldOrderRequest {
  storeDetailsId: string;
  terminalId: string;
  sessionId: number;
  customerName: string;
  notes?: string;
  totalAmount: number;
  lines: CashierHeldOrderLineRequest[];
}

export interface CashierHeldOrder {
  id: string;
  name: string;
  customerName: string;
  time: Date;
  cart: CartItem[];
  raw?: unknown;
}
