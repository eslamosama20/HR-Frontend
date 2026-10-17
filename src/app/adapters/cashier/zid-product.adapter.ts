import {
  ZidActionResponse,
  ZidProduct,
  ZidProductListResponse,
  ZidSyncStatus
} from 'src/app/models/cashier/zid-integration.model';
import { normalizeZidSyncStatus } from './zid-order.adapter';
import { mapZidActionResponse } from './zid-settings.adapter';

const asArray = (value: any): any[] => Array.isArray(value) ? value : [];
const asNumber = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asString = (value: any, fallback = ''): string => value === null || value === undefined ? fallback : String(value);
const sourceOf = (response: any): any => {
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

export function mapZidProduct(response: any): ZidProduct {
  const source = sourceOf(response);
  const zidProductId = source.zidProductId ?? source.productId ?? source.zidId ?? source.externalId ?? source.id;
  const mainPurchaseClassId = source.mainPurchaseClassId ?? source.erpProductId ?? source.productUnitId ?? null;
  const syncStatus = source.syncStatus === null || source.syncStatus === undefined
    ? null
    : normalizeZidSyncStatus(source.syncStatus);

  return {
    id: asString(source.id ?? zidProductId),
    zidProductId,
    zidSku: asString(source.zidSku ?? source.sku ?? source.productSku),
    zidProductName: asString(source.zidProductName ?? source.name ?? source.productName, '-'),
    price: asNumber(source.price ?? source.salePrice),
    quantity: asNumber(source.quantity ?? source.stock ?? source.availableQuantity),
    isMapped: Boolean(source.isMapped ?? source.mapped ?? mainPurchaseClassId),
    mainPurchaseClassId,
    mainPurchaseClassName: asString(source.mainPurchaseClassName ?? source.erpProductName ?? source.productUnitName),
    lastSyncedAt: source.lastSyncedAt ?? source.lastSyncAt ?? null,
    syncStatus: syncStatus as ZidSyncStatus | null,
    mappingDraftId: mainPurchaseClassId ?? '',
    mappingDraftLabel: asString(source.mainPurchaseClassName ?? source.erpProductName ?? source.productUnitName),
    selected: false
  };
}

export function mapZidProductListResponse(response: any): ZidProductListResponse {
  const source = sourceOf(response);
  const items = asArray(source.items ?? source.products ?? source.data ?? response).map(mapZidProduct);
  const pageSize = asNumber(source.pageSize, items.length || 20);

  return {
    items,
    totalCount: asNumber(source.totalCount ?? source.count, items.length),
    page: asNumber(source.page, 1),
    pageSize,
    totalPages: asNumber(source.totalPages, Math.ceil((source.totalCount ?? items.length) / (pageSize || 1)))
  };
}

export function mapZidProductActionResponse(response: any): ZidActionResponse {
  return mapZidActionResponse(response);
}
