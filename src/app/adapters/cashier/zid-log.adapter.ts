import {
  ZidSyncDirection,
  ZidSyncLog,
  ZidSyncLogListResponse,
  ZidSyncStatus
} from 'src/app/models/cashier/zid-integration.model';
import { normalizeZidSyncStatus } from './zid-order.adapter';

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

export function normalizeZidSyncDirection(value: any): ZidSyncDirection {
  const numeric = Number(value);
  return numeric === 1 ? ZidSyncDirection.ErpToZid : ZidSyncDirection.ZidToErp;
}

export function getZidSyncDirectionLabel(direction: ZidSyncDirection): string {
  return direction === ZidSyncDirection.ErpToZid ? 'CASHIER_ZID.DIRECTION_ERP_TO_ZID' : 'CASHIER_ZID.DIRECTION_ZID_TO_ERP';
}

export function mapZidSyncLog(response: any): ZidSyncLog {
  const source = sourceOf(response);

  return {
    id: asString(source.id),
    eventType: asString(source.eventType ?? source.type),
    direction: normalizeZidSyncDirection(source.direction),
    status: normalizeZidSyncStatus(source.status) as ZidSyncStatus,
    errorMessage: asString(source.errorMessage ?? source.error),
    zidResourceId: asString(source.zidResourceId ?? source.resourceId ?? source.externalId),
    durationMs: asNumber(source.durationMs ?? source.elapsedMs),
    createdAt: source.createdAt ?? null
  };
}

export function mapZidSyncLogListResponse(response: any): ZidSyncLogListResponse {
  const source = sourceOf(response);
  const items = asArray(source.items ?? source.logs ?? source.data ?? response).map(mapZidSyncLog);
  const pageSize = asNumber(source.pageSize, items.length || 50);

  return {
    items,
    totalCount: asNumber(source.totalCount ?? source.count, items.length),
    page: asNumber(source.page, 1),
    pageSize,
    totalPages: asNumber(source.totalPages, Math.ceil((source.totalCount ?? items.length) / (pageSize || 1)))
  };
}
