/**
 * Cashier Product Model - منتج في نقطة البيع
 */
export interface CashierProduct {
  id: number;
  code: string;
  barcode?: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  
  // Pricing
  sellingPrice: number;
  costPrice: number;
  minPrice?: number;
  maxDiscount?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  bulkPrice?: number;
  
  // Category
  categoryId?: number;
  categoryNameAr?: string;
  categoryNameEn?: string;
  
  // Stock
  availableQuantity: number;
  unitId?: number;
  unitName?: string;
  
  // Tax
  taxPercentage: number;
  includesTax: boolean;
  
  // Display
  image?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  isFavorite?: boolean;
  sortOrder?: number;
  
  // Additional Info
  manufacturer?: string;
  expiryDate?: Date | string;
  batchNo?: string;
  shelfNumber?: string;
  rowNumber?: string;
  isService?: boolean;
  allowDecimal?: boolean;
}

/**
 * Product Category for POS
 */
export interface ProductCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  parentId?: number;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive: boolean;
  productsCount?: number;
}

/**
 * Product Search Filter
 */
export interface ProductSearchFilter {
  searchTerm?: string;
  categoryId?: number;
  barcode?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFavorite?: boolean;
  storeDetailsId?: string;
  cashierSessionId?: number;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * Quick Product (for frequently used items)
 */
export interface QuickProduct {
  productId: number;
  productName: string;
  price: number;
  barcode?: string;
  color?: string;
  icon?: string;
  hotkey?: string; // F1-F12
  position?: number;
}
