import { ZidActionResponse, ZidStockSyncResult } from 'src/app/models/cashier/zid-integration.model';
import { mapZidActionResponse } from './zid-settings.adapter';

const asArray = (value: any): any[] => Array.isArray(value) ? value : [];
const asNumber = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function mapZidStockSyncResult(response: any): ZidStockSyncResult {
  const source = response?.data ?? response?.result ?? response ?? {};
  const errors = asArray(source.errors ?? source.errorMessages).map(item => String(item));

  return {
    totalProducts: asNumber(source.totalProducts ?? source.total),
    succeeded: asNumber(source.succeeded ?? source.successCount ?? source.synced),
    failed: asNumber(source.failed ?? source.failedCount),
    errors,
    durationMs: asNumber(source.durationMs ?? source.elapsedMs)
  };
}

export function mapZidStockActionResponse(response: any): ZidActionResponse {
  return mapZidActionResponse(response);
}
