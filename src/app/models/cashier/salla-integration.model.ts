/**
 * Salla Integration Models — نماذج تكامل سلة
 *
 * Based on Backend API Contract:
 *   Base URL: /api/integrations/salla
 *
 * These models map directly to the JSON responses
 * documented in the Salla Integration Production API.
 */

// =====================================================
// Enums
// =====================================================

/** Order status on Salla */
export enum SallaOrderStatus {
  New = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Refunded = 4
}

/** Sync status between Salla order and ERP invoice */
export enum SallaSyncStatus {
  Pending = 0,
  Synced = 1,
  Failed = 2
}

/** Payment status on Salla */
export enum SallaPaymentStatus {
  Unpaid = 0,
  Paid = 1
}

/** Sync log direction */
export enum SallaSyncDirection {
  SallaToErp = 0,
  ErpToSalla = 1
}

// =====================================================
// Settings & Dashboard
// =====================================================

/**
 * GET /api/integrations/salla/settings
 * Connection status and dashboard statistics.
 */
export interface SallaSettings {
  isConnected: boolean;
  storeName: string | null;
  totalOrders: number;
  pendingSyncOrders: number;
  mappedProducts: number;
  unmappedProducts: number;
  lastSyncAt: string | null;
}

// =====================================================
// Product Mapping
// =====================================================

/**
 * Single product mapping record returned by
 * GET /api/integrations/salla/products
 */
export interface SallaProduct {
  id: string;
  sallaProductId: number;
  sallaSku: string;
  sallaProductName: string;
  sallaPrice: number;
  productUnitId: string | null;
  productUnitName: string | null;
  isMapped: boolean;
  lastSyncedAt: string | null;
}

/**
 * Paginated response for product listing.
 */
export interface SallaProductListResponse {
  items: SallaProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Request body for POST /api/integrations/salla/products/map
 */
export interface SallaMapProductRequest {
  sallaProductId: number;
  productUnitId: string;
}

/**
 * Request body for POST /api/integrations/salla/products/bulk-map
 */
export interface SallaBulkMapRequest {
  mappings: SallaMapProductRequest[];
}

/**
 * Request body for POST /api/integrations/salla/products/sync-all-stock
 */
export interface SallaSyncStockRequest {
  storeDetailsId: string;
}

/**
 * Response from POST /api/integrations/salla/products/sync-all-stock
 */
export interface SallaSyncStockResponse {
  storeDetailsId: string;
  totalProducts: number;
  successCount: number;
  failedCount: number;
  message: string;
  errors: string[];
}

// =====================================================
// Orders
// =====================================================

/**
 * Order item (line item inside an order).
 * Returned as part of GET /api/integrations/salla/orders/{id}
 */
export interface SallaOrderItem {
  id: string;
  sallaProductId: number;
  sallaSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
  discountAmount: number;
  optionsSummary: string | null;
  productUnitId: string | null;
  productUnitName: string | null;
  isMapped: boolean;
}

/**
 * Order summary — returned in list endpoints.
 * GET /api/integrations/salla/orders
 */
export interface SallaOrder {
  id: string;
  sallaOrderId: number;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: SallaOrderStatus;
  paymentStatus: SallaPaymentStatus;
  fulfillmentStatus: number;
  subTotal?: number;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  shippingCity?: string;
  shippingDistrict?: string;
  shippingStreet?: string;
  syncStatus: SallaSyncStatus;
  syncError?: string | null;
  syncedAt?: string | null;
  saleInvoiceId: string | null;
  sallaCreatedAt: string;
  itemsCount: number;
  /** Only populated when fetching single order details */
  items?: SallaOrderItem[];
}

/**
 * Paginated response for order listing.
 */
export interface SallaOrderListResponse {
  items: SallaOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Query parameters for GET /api/integrations/salla/orders
 */
export interface SallaOrderFilter {
  page?: number;
  pageSize?: number;
  status?: SallaOrderStatus | null;
  syncStatus?: SallaSyncStatus | null;
}

// =====================================================
// Cashier-specific Orders
// =====================================================

/**
 * Cashier order item — simplified for cashier screen.
 */
export interface SallaCashierOrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  isMapped: boolean;
  productUnitName: string | null;
}

/**
 * Single pending order shown in the cashier screen.
 */
export interface SallaCashierOrder {
  id: string;
  sallaOrderId: number;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  currency: string;
  isPaidOnline: boolean;
  paymentMethod: string;
  itemsCount: number;
  items: SallaCashierOrderItem[];
}

/**
 * Response from GET /api/integrations/salla/orders/cashier/{storeId}
 */
export interface SallaCashierOrdersResponse {
  storeDetailsId: string;
  pendingCount: number;
  orders: SallaCashierOrder[];
}

// =====================================================
// Sync to Invoice
// =====================================================

/**
 * Request body for POST /api/integrations/salla/orders/{id}/sync-to-invoice
 */
export interface SallaSyncToInvoiceRequest {
  storeDetailsId: string;
}

/**
 * Successful response from sync-to-invoice.
 */
export interface SallaSyncToInvoiceResponse {
  status: string;
  message: string;
  invoiceId?: string;
}

/**
 * Request body for PUT /api/integrations/salla/orders/{id}/status
 */
export interface SallaUpdateStatusRequest {
  status: SallaOrderStatus;
}

// =====================================================
// Sync Logs
// =====================================================

/**
 * Single sync log entry.
 * GET /api/integrations/salla/sync-logs
 */
export interface SallaSyncLog {
  id: string;
  eventType: string;
  direction: SallaSyncDirection;
  status: SallaSyncStatus;
  errorMessage: string | null;
  sallaResourceId: number | null;
  durationMs: number;
  createdAt: string;
}

/**
 * Paginated response for sync logs.
 */
export interface SallaSyncLogListResponse {
  items: SallaSyncLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Query parameters for GET /api/integrations/salla/sync-logs
 */
export interface SallaSyncLogFilter {
  page?: number;
  pageSize?: number;
  eventType?: string;
}

// =====================================================
// Generic API response wrappers
// =====================================================

/** Simple status response used by map, sync, status-update endpoints */
export interface SallaActionResponse {
  status: string;
  message?: string;
  count?: number;
}
