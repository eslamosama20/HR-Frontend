export interface TopProductModel {
  productId: string;
  productCode: string;
  productNameAr: string;
  productNameEn: string;
  unitName: string;
  transactionCount: number;
  totalQuantity: number;
  totalAmount: number;
  lastTransactionDate?: Date | string;
  averageUnitPrice: number;
  rank: number;
}

export interface TopProductsFilter {
  fromDate?: Date | string;
  toDate?: Date | string;
  top?: number;
  searchTerm?: string;
  storeId?: string;
}

export interface TopProductsStatistics {
  totalProducts: number;
  totalTransactions: number;
  totalQuantity: number;
  totalAmount: number;
}
