import { ZidActionResponse, ZidOAuthUrlResponse, ZidSettings } from 'src/app/models/cashier/zid-integration.model';

const asNumber = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function mapZidSettingsResponse(response: any): ZidSettings {
  const source = response?.data ?? response?.result ?? response ?? {};

  return {
    isConnected: Boolean(source.isConnected ?? source.connected ?? false),
    tokenExpiresAt: source.tokenExpiresAt ?? source.expiresAt ?? null,
    totalOrders: asNumber(source.totalOrders),
    pendingOrders: asNumber(source.pendingOrders ?? source.pendingSyncOrders),
    syncedOrders: asNumber(source.syncedOrders),
    failedOrders: asNumber(source.failedOrders),
    totalProducts: asNumber(source.totalProducts),
    mappedProducts: asNumber(source.mappedProducts),
    lastSyncAt: source.lastSyncAt ?? source.lastSyncedAt ?? null
  };
}

export function mapZidOAuthUrlResponse(response: any): ZidOAuthUrlResponse {
  const source = response?.data ?? response?.result ?? response ?? {};
  const url = typeof response === 'string'
    ? response
    : source.url ?? source.oauthUrl ?? source.authorizationUrl ?? source.redirectUrl ?? '';

  return { url };
}

export function mapZidActionResponse(response: any, defaultMessage = ''): ZidActionResponse {
  const source = response?.data ?? response?.result ?? response ?? {};

  return {
    success: Boolean(source.success ?? source.isSuccess ?? true),
    message: source.message ?? source.error ?? defaultMessage,
    id: source.id ?? source.invoiceId ?? source.saleInvoiceId ?? null,
    raw: response
  };
}
