import {
  ZidActionResponse,
  ZidCashierOrder,
  ZidCashierOrdersResponse,
  ZidOrder,
  ZidOrderItem,
  ZidOrderListResponse,
  ZidOrderStatus,
  ZidPaymentStatus,
  ZidSyncStatus,
  ZidTagSeverity
} from 'src/app/models/cashier/zid-integration.model';
import { mapZidActionResponse } from './zid-settings.adapter';

const asArray = (value: any): any[] => Array.isArray(value) ? value : [];
const asNumber = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asString = (value: any, fallback = ''): string => value === null || value === undefined ? fallback : String(value);
const normalizePageSource = (response: any): any => {
  if (Array.isArray(response)) {
    return { items: response };
  }
  if (Array.isArray(response?.data)) {
    return { ...response, items: response.data };
  }
  if (Array.isArray(response?.result?.data)) {
    return { ...response.result, items: response.result.data };
  }
  return response?.data ?? response?.result ?? response ?? {};
};

export function normalizeZidOrderStatus(value: any): ZidOrderStatus {
  if (typeof value === 'string') {
    switch (value.trim().toLowerCase().replace(/[\s-]+/g, '_')) {
      case 'new':
        return ZidOrderStatus.New;
      case 'in_progress':
      case 'processing':
        return ZidOrderStatus.InProgress;
      case 'completed':
        return ZidOrderStatus.Completed;
      case 'cancelled':
      case 'canceled':
        return ZidOrderStatus.Cancelled;
      case 'refunded':
        return ZidOrderStatus.Refunded;
      case 'ready_for_shipping':
        return ZidOrderStatus.ReadyForShipping;
      case 'shipped':
        return ZidOrderStatus.Shipped;
      case 'delivered':
        return ZidOrderStatus.Delivered;
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 7
    ? numeric as ZidOrderStatus
    : ZidOrderStatus.New;
}

export function normalizeZidSyncStatus(value: any): ZidSyncStatus {
  if (typeof value === 'string') {
    switch (value.trim().toLowerCase().replace(/[\s-]+/g, '_')) {
      case 'synced':
      case 'success':
        return ZidSyncStatus.Synced;
      case 'failed':
      case 'error':
        return ZidSyncStatus.Failed;
      case 'skipped':
        return ZidSyncStatus.Skipped;
      default:
        return ZidSyncStatus.Pending;
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 3
    ? numeric as ZidSyncStatus
    : ZidSyncStatus.Pending;
}

export function normalizeZidPaymentStatus(value: any): ZidPaymentStatus {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized.includes('refund')) return ZidPaymentStatus.Refunded;
    if (normalized.includes('unpaid') || normalized.includes('pending')) return ZidPaymentStatus.Unpaid;
    if (normalized.includes('partial')) return ZidPaymentStatus.PartiallyPaid;
    if (normalized.includes('paid')) return ZidPaymentStatus.Paid;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 3
    ? numeric as ZidPaymentStatus
    : ZidPaymentStatus.Unknown;
}

export function getZidOrderStatusLabel(status: ZidOrderStatus): string {
  switch (status) {
    case ZidOrderStatus.New: return 'CASHIER_ZID.STATUS_NEW';
    case ZidOrderStatus.InProgress: return 'CASHIER_ZID.STATUS_IN_PROGRESS';
    case ZidOrderStatus.Completed: return 'CASHIER_ZID.STATUS_COMPLETED';
    case ZidOrderStatus.Cancelled: return 'CASHIER_ZID.STATUS_CANCELLED';
    case ZidOrderStatus.Refunded: return 'CASHIER_ZID.STATUS_REFUNDED';
    case ZidOrderStatus.ReadyForShipping: return 'CASHIER_ZID.STATUS_READY_FOR_SHIPPING';
    case ZidOrderStatus.Shipped: return 'CASHIER_ZID.STATUS_SHIPPED';
    case ZidOrderStatus.Delivered: return 'CASHIER_ZID.STATUS_DELIVERED';
    default: return '';
  }
}

export function getZidOrderStatusSeverity(status: ZidOrderStatus): ZidTagSeverity {
  switch (status) {
    case ZidOrderStatus.Completed:
    case ZidOrderStatus.Delivered:
      return 'success';
    case ZidOrderStatus.Cancelled:
    case ZidOrderStatus.Refunded:
      return 'danger';
    case ZidOrderStatus.InProgress:
    case ZidOrderStatus.ReadyForShipping:
    case ZidOrderStatus.Shipped:
      return 'warning';
    default:
      return 'info';
  }
}

export function getZidSyncStatusLabel(status: ZidSyncStatus): string {
  switch (status) {
    case ZidSyncStatus.Pending: return 'CASHIER_ZID.SYNC_PENDING';
    case ZidSyncStatus.Synced: return 'CASHIER_ZID.SYNC_SYNCED';
    case ZidSyncStatus.Failed: return 'CASHIER_ZID.SYNC_FAILED';
    case ZidSyncStatus.Skipped: return 'CASHIER_ZID.SYNC_SKIPPED';
    default: return '';
  }
}

export function getZidSyncStatusSeverity(status: ZidSyncStatus): ZidTagSeverity {
  switch (status) {
    case ZidSyncStatus.Synced: return 'success';
    case ZidSyncStatus.Failed: return 'danger';
    case ZidSyncStatus.Skipped: return 'secondary';
    default: return 'warning';
  }
}

export function getZidPaymentStatusLabel(status: ZidPaymentStatus, rawLabel = ''): string {
  if (rawLabel) return rawLabel;
  switch (status) {
    case ZidPaymentStatus.Paid: return 'CASHIER_ZID.PAYMENT_PAID';
    case ZidPaymentStatus.Unpaid: return 'CASHIER_ZID.PAYMENT_UNPAID';
    case ZidPaymentStatus.PartiallyPaid: return 'CASHIER_ZID.PAYMENT_PARTIALLY_PAID';
    case ZidPaymentStatus.Refunded: return 'CASHIER_ZID.PAYMENT_REFUNDED';
    default: return '';
  }
}

export function getZidPaymentStatusSeverity(status: ZidPaymentStatus): ZidTagSeverity {
  switch (status) {
    case ZidPaymentStatus.Paid: return 'success';
    case ZidPaymentStatus.Refunded: return 'danger';
    case ZidPaymentStatus.PartiallyPaid: return 'warning';
    default: return 'secondary';
  }
}

export function mapZidOrderItem(item: any): ZidOrderItem {
  const zidProductId = item?.zidProductId ?? item?.productId ?? item?.zidId ?? item?.externalProductId ?? null;
  const unitPrice = asNumber(item?.unitPrice ?? item?.price);
  const quantity = asNumber(item?.quantity, 1);

  return {
    id: asString(item?.id ?? item?.lineId ?? zidProductId),
    zidProductId,
    zidSku: asString(item?.zidSku ?? item?.sku ?? item?.productSku),
    productName: asString(item?.productName ?? item?.name ?? item?.zidProductName, '-'),
    quantity,
    unitPrice,
    totalPrice: asNumber(item?.totalPrice ?? item?.total ?? unitPrice * quantity),
    isMapped: Boolean(item?.isMapped ?? item?.mapped ?? item?.mainPurchaseClassId),
    mainPurchaseClassId: item?.mainPurchaseClassId ?? item?.erpProductId ?? item?.productUnitId ?? null,
    mainPurchaseClassName: asString(item?.mainPurchaseClassName ?? item?.erpProductName ?? item?.productUnitName)
  };
}

export function mapZidOrder(response: any): ZidOrder {
  const source = normalizePageSource(response);
  const customer = source.customer ?? source.customerInfo ?? {};
  const totals = source.totals ?? source.amounts ?? {};
  const status = normalizeZidOrderStatus(source.status ?? source.orderStatus);
  const syncStatus = normalizeZidSyncStatus(source.syncStatus);
  const paymentStatus = normalizeZidPaymentStatus(source.paymentStatus ?? source.payment?.status);
  const rawItems = source.items ?? source.orderItems ?? source.lines ?? [];

  return {
    id: asString(source.id ?? source.orderId ?? source.zidOrderId),
    zidOrderId: source.zidOrderId ?? source.externalOrderId ?? source.orderId ?? source.id ?? null,
    referenceNumber: asString(source.referenceNumber ?? source.orderReference ?? source.reference ?? source.code ?? source.id, '-'),
    customerName: asString(source.customerName ?? customer.name ?? customer.fullName, '-'),
    customerPhone: asString(source.customerPhone ?? customer.phone ?? customer.mobile),
    customerEmail: asString(source.customerEmail ?? customer.email),
    paymentStatus,
    paymentStatusLabel: getZidPaymentStatusLabel(paymentStatus, asString(source.paymentStatusLabel ?? source.payment?.statusLabel)),
    status,
    syncStatus,
    totalAmount: asNumber(source.totalAmount ?? source.total ?? totals.total),
    subTotal: asNumber(source.subTotal ?? source.subtotal ?? totals.subTotal),
    taxAmount: asNumber(source.taxAmount ?? source.tax ?? totals.tax),
    shippingAmount: asNumber(source.shippingAmount ?? source.shipping ?? totals.shipping),
    discountAmount: asNumber(source.discountAmount ?? source.discount ?? totals.discount),
    currency: asString(source.currency ?? source.currencyCode, 'SAR'),
    storeName: asString(source.storeName ?? source.store?.name),
    storeDetailsId: source.storeDetailsId ?? source.storeId ?? null,
    invoiceId: source.invoiceId ?? source.saleInvoiceId ?? null,
    syncError: asString(source.syncError ?? source.errorMessage),
    createdAt: source.createdAt ?? source.orderDate ?? null,
    updatedAt: source.updatedAt ?? null,
    syncedAt: source.syncedAt ?? null,
    items: asArray(rawItems).map(mapZidOrderItem)
  };
}

export function mapZidOrderListResponse(response: any): ZidOrderListResponse {
  const source = normalizePageSource(response);
  const items = asArray(source.items ?? source.orders ?? source.data ?? response).map(mapZidOrder);
  const pageSize = asNumber(source.pageSize, items.length || 20);

  return {
    items,
    totalCount: asNumber(source.totalCount ?? source.count, items.length),
    page: asNumber(source.page, 1),
    pageSize,
    totalPages: asNumber(source.totalPages, Math.ceil((source.totalCount ?? items.length) / (pageSize || 1)))
  };
}

export function mapZidCashierOrder(response: any): ZidCashierOrder {
  const order = mapZidOrder(response);
  return {
    id: order.id,
    zidOrderId: order.zidOrderId,
    referenceNumber: order.referenceNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    totalAmount: order.totalAmount,
    currency: order.currency,
    createdAt: order.createdAt,
    status: order.status,
    syncStatus: order.syncStatus,
    items: order.items
  };
}

export function mapZidCashierOrdersResponse(response: any): ZidCashierOrdersResponse {
  const source = normalizePageSource(response);
  const rawItems = source.items ?? source.orders ?? source.data ?? response;
  const items = asArray(rawItems).map(mapZidCashierOrder);

  return {
    items,
    totalCount: asNumber(source.totalCount ?? source.count, items.length)
  };
}

export function mapZidOrderActionResponse(response: any): ZidActionResponse {
  return mapZidActionResponse(response);
}
