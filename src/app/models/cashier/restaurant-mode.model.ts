import { CashierProduct } from './cashier-product.model';
import { PaymentMethod } from './pos-invoice.model';

export enum DiningTableStatus {
  Available = 'available',
  Occupied = 'occupied',
  NewOrder = 'new-order',
  ReadyToPay = 'ready-to-pay',
  Cleaning = 'cleaning'
}

export enum RestaurantOrderStatus {
  New = 'new',
  Preparing = 'preparing',
  Ready = 'ready',
  Served = 'served',
  Paid = 'paid',
  Cancelled = 'cancelled'
}

export enum OrderType {
  DineIn = 'dine-in',
  Takeaway = 'takeaway',
  Delivery = 'delivery'
}

export enum OrderSource {
  SelfService = 'self-service',
  Cashier = 'cashier'
}

export interface DiningArea {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface DiningTable {
  id: number;
  tableNumber: string;
  seats: number;
  areaId: string;
  areaName: string;
  token: string;
  sortOrder: number;
  status: DiningTableStatus;
  activeOrders: number;
  unpaidTotal: number;
  lastActivityAt?: Date;
  notes?: string;
}

export interface RestaurantOrderItem {
  itemId: number;
  itemCode?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  image?: string;
  notes?: string;
}

export interface RestaurantOrder {
  id: number;
  invoiceId?: number;
  orderNo: string;
  tableId: number | null;
  tableNumber: string;
  customerName?: string;
  source: OrderSource;
  orderType?: OrderType;
  status: RestaurantOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  preparationMinutes?: number;
  preparationStartedAt?: Date;
  expectedReadyAt?: Date;
  actualReadyAt?: Date;
  items: RestaurantOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export interface SelfOrderDraftItem {
  productId: number;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface PlaceSelfOrderRequest {
  tableToken: string;
  customerName?: string;
  notes?: string;
  items: SelfOrderDraftItem[];
}

export interface PlaceSelfOrderResult {
  success: boolean;
  order?: RestaurantOrder;
  message?: string;
}

export interface TableBillingSnapshot {
  table: DiningTable;
  orders: RestaurantOrder[];
  items: RestaurantOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export interface CloseTableResult {
  snapshot: TableBillingSnapshot;
  paymentMethod: PaymentMethod;
  paidAt: Date;
}

export interface RequestTableBillResult {
  success: boolean;
  table?: DiningTable;
  message?: string;
}

export interface CreateTableRequest {
  tableNumber: string;
  seats: number;
  areaId: string;
  notes?: string;
}

export interface UpdateTableRequest {
  tableNumber?: string;
  seats?: number;
  areaId?: string;
  notes?: string;
}

export interface MenuCatalogItem extends CashierProduct {
  image?: string;
}
