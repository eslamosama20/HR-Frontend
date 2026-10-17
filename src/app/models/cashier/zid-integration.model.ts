export type ZidTagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export enum ZidOrderStatus {
  New = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Refunded = 4,
  ReadyForShipping = 5,
  Shipped = 6,
  Delivered = 7
}

export enum ZidSyncStatus {
  Pending = 0,
  Synced = 1,
  Failed = 2,
  Skipped = 3
}

export enum ZidPaymentStatus {
  Unpaid = 0,
  Paid = 1,
  PartiallyPaid = 2,
  Refunded = 3,
  Unknown = 99
}

export enum ZidSyncDirection {
  ZidToErp = 0,
  ErpToZid = 1
}

export interface ZidSettings {
  isConnected: boolean;
  tokenExpiresAt: string | null;
  totalOrders: number;
  pendingOrders: number;
  syncedOrders: number;
  failedOrders: number;
  totalProducts: number;
  mappedProducts: number;
  lastSyncAt: string | null;
}

export interface ZidOAuthUrlResponse {
  url: string;
}

export interface ZidSetTokenRequest {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}

export interface ZidActionResponse {
  success: boolean;
  message: string;
  id?: string | number | null;
  raw?: any;
}

export interface ZidOrderItem {
  id: string;
  zidProductId: number | string | null;
  zidSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isMapped: boolean;
  mainPurchaseClassId: string | null;
  mainPurchaseClassName: string;
}

export interface ZidOrder {
  id: string;
  zidOrderId: string | number | null;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentStatus: ZidPaymentStatus;
  paymentStatusLabel: string;
  status: ZidOrderStatus;
  syncStatus: ZidSyncStatus;
  totalAmount: number;
  subTotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  currency: string;
  storeName: string;
  storeDetailsId: string | null;
  invoiceId: string | null;
  syncError: string;
  createdAt: string | null;
  updatedAt: string | null;
  syncedAt: string | null;
  items: ZidOrderItem[];
}

export interface ZidOrderListResponse {
  items: ZidOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ZidOrderFilter {
  page?: number;
  pageSize?: number;
  status?: ZidOrderStatus | null;
  syncStatus?: ZidSyncStatus | null;
}

export interface ZidSyncOrderRequest {
  storeDetailsId: string;
}

export interface ZidUpdateOrderStatusRequest {
  status: ZidOrderStatus;
}

export interface ZidProduct {
  id: string;
  zidProductId: number | string;
  zidSku: string;
  zidProductName: string;
  price: number;
  quantity: number;
  isMapped: boolean;
  mainPurchaseClassId: string | null;
  mainPurchaseClassName: string;
  lastSyncedAt: string | null;
  syncStatus: ZidSyncStatus | null;
  mappingDraftId?: string;
  mappingDraftLabel?: string;
  selected?: boolean;
}

export interface ZidProductListResponse {
  items: ZidProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ZidMapProductRequest {
  zidProductId: number | string;
  mainPurchaseClassId: string;
}

export interface ZidStockSyncResult {
  totalProducts: number;
  succeeded: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

export interface ZidCashierOrder {
  id: string;
  zidOrderId: string | number | null;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  currency: string;
  createdAt: string | null;
  status: ZidOrderStatus;
  syncStatus: ZidSyncStatus;
  items: ZidOrderItem[];
}

export interface ZidCashierOrdersResponse {
  items: ZidCashierOrder[];
  totalCount: number;
}

export interface ZidSyncLog {
  id: string;
  eventType: string;
  direction: ZidSyncDirection;
  status: ZidSyncStatus;
  errorMessage: string;
  zidResourceId: string;
  durationMs: number;
  createdAt: string | null;
}

export interface ZidSyncLogFilter {
  page?: number;
  pageSize?: number;
  eventType?: string | null;
}

export interface ZidSyncLogListResponse {
  items: ZidSyncLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
