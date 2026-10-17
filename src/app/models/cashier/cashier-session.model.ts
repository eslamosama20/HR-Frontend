/**
 * Cashier Session Model - جلسة/وردية الكاشير
 */
export interface CashierSession {
  id?: number;
  sessionNumber?: string;
  cashierUserId?: number;
  cashierUserName?: string;
  openingDate?: Date;
  closingDate?: Date;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  status: CashierSessionStatus;
  notes?: string;
  treasuryId?: number;
  treasuryName?: string;
  branchId?: number;
  branchName?: string;
  storeDetailsId?: string;
  storeName?: string;
  terminalId?: string;
  stockAlertLimit?: number;
  
  // Transaction Summary
  totalSales?: number;
  totalRefunds?: number;
  totalCash?: number;
  totalCard?: number;
  totalCredit?: number;
  cashDrawerOpenings?: number;
  
  createdBy?: string;
  createdDate?: Date;
  modifiedBy?: string;
  modifiedDate?: Date;
}

export enum CashierSessionStatus {
  Open = 0,
  Closed = 1,
  Suspended = 2
}

export interface CashierSessionSummary {
  sessionId: number;
  totalTransactions: number;
  totalSalesAmount: number;
  totalRefundsAmount: number;
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
}
