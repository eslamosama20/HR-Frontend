export type CashierAuditSeverity = 'info' | 'warning' | 'critical' | string;

export interface CashierAuditLogDto {
  id: number | string;
  eventDate?: string;
  occurredAt?: string;
  createdAt?: string;
  eventType?: string;
  action?: string;
  entityType?: string;
  entityRef?: string;
  invoiceNo?: string;
  userId?: string | null;
  userName?: string | null;
  sessionId?: number | string | null;
  storeDetailsId?: string | null;
  severity?: CashierAuditSeverity;
  payloadJson?: string | Record<string, unknown> | null;
  amount?: number | null;
  ipAddress?: string | null;
}

export interface CashierAuditStatsDto {
  total?: number;
  critical?: number;
  byEventType?: Array<{ eventType: string; count: number }>;
}

export interface CashierAuditLogTypeDto {
  code: string;
  label: string;
  severity?: CashierAuditSeverity;
}

export interface CashierAuditLogFilters {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  storeDetailsId?: string;
  sessionId?: number | string;
  userId?: string;
  eventType?: string;
  invoiceNo?: string;
  keyword?: string;
}
