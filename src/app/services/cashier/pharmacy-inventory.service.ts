import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import {
  PharmacyApiService,
  PharmacyItemBatchDto,
  PharmacyProductLookupItem
} from './pharmacy-api.service';
import {
  isPharmacyStore,
  normalizeStoreCategory,
  StoreCategory,
  StoreDetailsModel
} from 'src/app/models/inventory/storeDetails.model';
import {
  MainPurchaseClassModel,
  normalizeMainPurchaseItemType
} from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { InventoryStocksModel } from 'src/app/models/reports/inventory-stocks/inventoryStocks.model';
import {
  PharmacyInventoryBatchLookup,
  PharmacyInventoryBatchOption,
  PharmacyInventoryProductOption,
  PharmacyRestrictedMedicationStockLine,
  PharmacyStockRestrictionType
} from 'src/app/models/cashier/pharmacy-inventory.model';
import { StoreDetailsService } from '../inventory/store-details.service';
import { MainPurchaseClassService } from '../purchase-classes-tree/main-purchase-class.service';
import { InventoryStocksService } from '../reports/inventory-stocks.service';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';

interface PharmacyInventorySnapshot {
  products: PharmacyInventoryProductOption[];
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyInventoryService {
  private snapshot$?: Observable<PharmacyInventorySnapshot>;

  constructor(
    private storeDetailsService: StoreDetailsService,
    private inventoryStocksService: InventoryStocksService,
    private mainPurchaseClassService: MainPurchaseClassService,
    private pharmacyApiService: PharmacyApiService
  ) {}

  refreshSnapshot(): void {
    this.snapshot$ = undefined;
  }

  /**
   * Medication lines with positive, non-expired stock for a single pharmacy store (from inventory snapshot).
   * One row per batch line. Prefer dedicated GET .../restricted-drugs/lookup-stock when Backend ships it.
   */
  getMedicationStockLinesForStore(
    storeDetailsId: string,
    searchTerm = ''
  ): Observable<PharmacyRestrictedMedicationStockLine[]> {
    const storeId = `${storeDetailsId ?? ''}`.trim();
    if (!storeId) {
      return of([]);
    }

    const term = searchTerm.trim().toLowerCase();

    return forkJoin({
      snapshot: this.getSnapshot(),
      masters: this.mainPurchaseClassService.getAll()
    }).pipe(
      map(({ snapshot, masters }) => {
        const unitByProductId = new Map<string, string>();
        (masters || []).forEach(m => {
          const pid = `${m.id ?? ''}`.trim();
          if (!pid) {
            return;
          }
          const u = m.measurementUnit;
          const label = [u?.arabicName, u?.englishName].filter(Boolean).join(' / ') || '';
          unitByProductId.set(pid, label);
        });

        const lines: PharmacyRestrictedMedicationStockLine[] = [];

        for (const product of snapshot.products) {
          if (product.storeId !== storeId) {
            continue;
          }

          for (const batch of product.batches) {
            const itemName = batch.itemName || product.itemName;
            const itemCode = batch.itemCode || product.itemCode;
            const restrictionType = this.resolveRestrictionTypeFromMaster(masters, batch.productId);

            lines.push({
              selectionKey: batch.selectionKey,
              storeDetailsId: product.storeId,
              itemId: batch.productId,
              itemName,
              itemCode,
              availableQty: batch.availableQuantity,
              batchNo: `${batch.batchNo ?? ''}`.trim(),
              expiryDate: batch.expiryDate ?? null,
              unitName: unitByProductId.get(batch.productId) ?? '',
              needsBatch: batch.needsBatch,
              needsExpiry: batch.needsExpiry,
              restrictionType,
              displayLabel: `${itemName} — ${itemCode} — متاح ${batch.availableQuantity}`
            });
          }
        }

        const filtered = !term
          ? lines
          : lines.filter(l => `${l.itemName} ${l.itemCode} ${l.batchNo}`.toLowerCase().includes(term));

        return filtered.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ar'));
      })
    );
  }

  searchMedicationProducts(searchTerm: string): Observable<PharmacyInventoryProductOption[]> {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return of([]);
    }

    return forkJoin({
      snapshot: this.getSnapshot(),
      metadata: this.pharmacyApiService.searchItems(searchTerm, undefined, { maxResults: 30 }).pipe(
        catchError(() => of([] as PharmacyProductLookupItem[]))
      )
    }).pipe(
      map(({ snapshot, metadata }) => {
        const metadataMap = this.buildMetadataMap(metadata);

        return snapshot.products
          .filter(product => this.matchesSearch(product, normalizedTerm))
          .map(product => this.enrichProduct(product, metadataMap))
          .sort((left, right) => {
            const nameCompare = left.itemName.localeCompare(right.itemName, 'ar');
            if (nameCompare !== 0) {
              return nameCompare;
            }
            return left.storeName.localeCompare(right.storeName, 'ar');
          });
      })
    );
  }

  /**
   * All in-stock pharmacy medication lines from the current inventory snapshot (same rules as {@link searchMedicationProducts} stock build).
   * Uses cached {@link getSnapshot} — no per-keystroke HTTP. Optional `items/lookup` enrichment is not applied (avoid N+1 calls).
   */
  getAllAvailableMedicationProducts(): Observable<PharmacyInventoryProductOption[]> {
    return this.getSnapshot().pipe(
      map((snapshot) =>
        [...snapshot.products].sort((left, right) => {
          const nameCompare = left.itemName.localeCompare(right.itemName, 'ar');
          if (nameCompare !== 0) {
            return nameCompare;
          }
          return left.storeName.localeCompare(right.storeName, 'ar');
        })
      )
    );
  }

  getAvailableBatchesForProduct(
    productId: string,
    storeId?: string
  ): Observable<PharmacyInventoryBatchOption[]> {
    return this.getSnapshot().pipe(
      map(snapshot => {
        const batches = snapshot.products
          .filter(product => product.productId === productId && (!storeId || product.storeId === storeId))
          .flatMap(product => product.batches);

        return [...batches].sort((left, right) => this.compareBatchOptions(left, right));
      })
    );
  }

  getAllAvailableBatches(): Observable<PharmacyInventoryBatchOption[]> {
    return this.getSnapshot().pipe(
      map(snapshot =>
        snapshot.products
          .flatMap(product => product.batches)
          .sort((left, right) => this.compareBatchOptions(left, right))
      )
    );
  }

  /**
   * Server-backed batches from `GET /pharmacy/items/{pharmacyItemId}/batches` (FNV `itemId` from lookup).
   * Resolves `productId` (MainPurchaseClass Guid) by matching `itemCode` in master data when possible.
   */
  getBatchesForPharmacyCatalogItem(
    pharmacyItemId: number,
    storeDetailsId: string,
    lookupRow: Pick<PharmacyProductLookupItem, 'itemCode' | 'itemName' | 'unitPrice'>
  ): Observable<PharmacyInventoryBatchOption[]> {
    const storeId = `${storeDetailsId ?? ''}`.trim();
    if (!pharmacyItemId || !storeId) {
      return of([]);
    }

    return this.resolveMainPurchaseClassIdByItemCode(lookupRow.itemCode).pipe(
      switchMap((productId) =>
        this.pharmacyApiService.getItemBatches(pharmacyItemId, storeId, true).pipe(
          map((res) =>
            (res.batches || []).map((batch) =>
              this.mapPharmacyApiBatchToOption(batch, storeId, productId ?? '', lookupRow)
            )
          )
        )
      )
    );
  }

  /**
   * Live medication search for a single store — `GET .../items/lookup` (no inventory snapshot required).
   */
  searchMedicationCatalogForStore(
    searchTerm: string,
    storeDetailsId: string,
    maxResults = 40
  ): Observable<PharmacyProductLookupItem[]> {
    let term = `${searchTerm ?? ''}`;
    const storeId = `${storeDetailsId ?? ''}`.trim();
    if (!storeId) {
      return of([]);
    }
    if (term.trim() === '') {
      term = ' '; // Bypass backend [Required] validation by sending a space, which backend trims to empty
    }
    return this.pharmacyApiService.searchItems(term, storeId, { maxResults }).pipe(
      catchError(() => of([] as PharmacyProductLookupItem[]))
    );
  }

  findMatchingBatch(lookup: PharmacyInventoryBatchLookup): Observable<PharmacyInventoryBatchOption | null> {
    if (!lookup.productId) {
      return of(null);
    }

    return this.getAvailableBatchesForProduct(lookup.productId, lookup.storeId).pipe(
      switchMap(batches => {
        const normalizedBatchNo = normalizeBatchNo(lookup.batchNo);
        const normalizedExpiryDate = this.normalizeDateOnly(lookup.expiryDate);

        const found = batches.find(batch => {
          const batchBatchNo = normalizeBatchNo(batch.batchNo);
          const batchExpiryDate = this.normalizeDateOnly(batch.expiryDate);

          if (normalizedBatchNo && batchBatchNo === normalizedBatchNo) {
            return true;
          }

          if (normalizedBatchNo && batchBatchNo !== normalizedBatchNo) {
            return false;
          }

          if (normalizedExpiryDate && batchExpiryDate !== normalizedExpiryDate) {
            return false;
          }

          if (lookup.needsBatch && !batchBatchNo) {
            return false;
          }

          if (lookup.needsExpiry && !batchExpiryDate) {
            return false;
          }

          return true;
        });

        if (found) {
          return of(found);
        }

        // Fallback: Query live batches directly from the Pharmacy API
        return this.mainPurchaseClassService.getAll().pipe(
          switchMap(masters => {
            const master = (masters || []).find(m => `${m.id ?? ''}`.trim().toLowerCase() === `${lookup.productId ?? ''}`.trim().toLowerCase());
            if (!master || !master.referenceCode) {
              return of(null);
            }
            
            const numericId = this.localItemCodeToIntId(master.referenceCode);
            return this.pharmacyApiService.getItemBatches(numericId, lookup.storeId, true).pipe(
              map(res => {
                const apiBatches = (res.batches || []).map(b => 
                  this.mapPharmacyApiBatchToOption(b, lookup.storeId, lookup.productId, {
                    itemCode: master.referenceCode,
                    itemName: master.arabicName || master.englishName || '',
                    unitPrice: master.lastPrice || 0
                  })
                );
                
                return apiBatches.find(b => {
                  const bBatchNo = normalizeBatchNo(b.batchNo);
                  const bExpiryDate = this.normalizeDateOnly(b.expiryDate);
                  
                  if (normalizedBatchNo && bBatchNo === normalizedBatchNo) {
                    return true;
                  }

                  if (normalizedBatchNo && bBatchNo !== normalizedBatchNo) {
                    return false;
                  }
                  if (normalizedExpiryDate && bExpiryDate !== normalizedExpiryDate) {
                    return false;
                  }
                  return true;
                }) || null;
              }),
              catchError(() => of(null))
            );
          })
        );
      })
    );
  }

  private localItemCodeToIntId(itemCode: string): number {
    const s = `${itemCode ?? ''}`;
    let hash = 2166136261;
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash & 0x7FFFFFFF) >>> 0;
  }

  private getSnapshot(): Observable<PharmacyInventorySnapshot> {
    if (!this.snapshot$) {
      this.snapshot$ = forkJoin({
        stores: this.storeDetailsService.getAll(),
        stocks: this.inventoryStocksService.getInventoryStocks(),
        products: this.mainPurchaseClassService.getAll()
      }).pipe(
        map(({ stores, stocks, products }) => this.buildSnapshot(stores, stocks, products)),
        shareReplay(1)
      );
    }

    return this.snapshot$;
  }

  private buildSnapshot(
    stores: StoreDetailsModel[],
    inventoryStocks: InventoryStocksModel[],
    products: MainPurchaseClassModel[]
  ): PharmacyInventorySnapshot {
    const storeMap = new Map((stores || []).map(store => [store.id ?? '', new StoreDetailsModel(store)]));
    const productMap = new Map((products || []).map(product => [product.id ?? '', new MainPurchaseClassModel(product)]));
    const productOptions = new Map<string, PharmacyInventoryProductOption>();
    const today = this.startOfDay(new Date());

    (inventoryStocks || []).forEach(stock => {
      const stockStoreId = stock.storeDetailsId ?? '';
      const store = storeMap.get(stockStoreId);
      const isReportPharmacyStore = stock.isPharmacyStore === true
        || normalizeStoreCategory(stock.storeCategory ?? stock.storeType) === StoreCategory.Pharmacy;

      if ((!store || !isPharmacyStore(store)) && !isReportPharmacyStore) {
        return;
      }

      (stock.storedItems || []).forEach(item => {
        const productId = item.mainPurchaseClassId ?? '';
        if (!productId) {
          return;
        }

        const masterProduct = productMap.get(productId);
        const normalizedItemType = normalizeMainPurchaseItemType(item.itemType ?? masterProduct?.itemType);
        const isMedication = !!item.isPharmacyItem
          || normalizedItemType === 'medication'
          || masterProduct?.isPharmacyItem === true;

        if (!isMedication) {
          return;
        }

        const availableQuantity = Number(item.quantity ?? 0);
        if (availableQuantity <= 0) {
          return;
        }

        const needsBatch = !!(item.needsBatch ?? masterProduct?.needsBatch);
        const needsExpiry = !!(item.needsExpiry ?? masterProduct?.needsExpiry);
        const batchNo = normalizeBatchNo(item.batchNo);
        const expiryDate = item.expiryDate ?? null;
        const isExpired = this.isExpired(expiryDate, today);

        if (isExpired) {
          return;
        }

        if (needsBatch && !batchNo) {
          return;
        }

        if (needsExpiry && !expiryDate) {
          return;
        }

        const batchOption = this.buildBatchOption({
          productId,
          itemCode: item.mainPurchaseClassReferenceCode ?? masterProduct?.referenceCode ?? '',
          itemName: item.mainPurchaseClassArabicName ?? masterProduct?.arabicName ?? '',
          storeId: stockStoreId,
          storeName: stock.storeDetailsArabicName ?? store?.arabicName ?? '',
          batchNo,
          expiryDate,
          availableQuantity,
          unitPrice: Number(item.lastPrice ?? masterProduct?.lastPrice ?? 0),
          needsBatch,
          needsExpiry,
          isPharmacyItem: isMedication
        });

        const productKey = `${stockStoreId}::${productId}`;
        const existingProduct = productOptions.get(productKey);
        if (existingProduct) {
          existingProduct.availableQuantity += batchOption.availableQuantity;
          existingProduct.batches.push(batchOption);
          return;
        }

        productOptions.set(productKey, {
          productId,
          itemCode: batchOption.itemCode,
          itemName: batchOption.itemName,
          storeId: stockStoreId,
          storeName: batchOption.storeName,
          availableQuantity: batchOption.availableQuantity,
          unitPrice: batchOption.unitPrice,
          needsBatch,
          needsExpiry,
          isPharmacyItem: isMedication,
          batches: [batchOption],
          preferredBatch: batchOption
        });
      });
    });

    const finalProducts = Array.from(productOptions.values())
      .map(product => {
        const sortedBatches = [...product.batches].sort((left, right) => this.compareBatchOptions(left, right));
        return {
          ...product,
          batches: sortedBatches,
          preferredBatch: sortedBatches[0] ?? null
        };
      })
      .filter(product => product.availableQuantity > 0);

    return {
      products: finalProducts
    };
  }

  private buildBatchOption(input: {
    productId: string;
    itemCode: string;
    itemName: string;
    storeId: string;
    storeName: string;
    batchNo?: string | null;
    expiryDate?: string | Date | null;
    availableQuantity: number;
    unitPrice: number;
    needsBatch: boolean;
    needsExpiry: boolean;
    isPharmacyItem: boolean;
  }): PharmacyInventoryBatchOption {
    const selectionKey = `${input.storeId}::${buildInventoryTrackingKey({
      productId: input.productId,
      batchNo: input.batchNo,
      expiryDate: input.expiryDate
    })}`;
    const batchLabel = input.batchNo || 'بدون باتش';
    const expiryLabel = input.expiryDate ? this.formatDate(input.expiryDate) : 'بدون صلاحية';

    return {
      selectionKey,
      productId: input.productId,
      itemCode: input.itemCode,
      itemName: input.itemName,
      storeId: input.storeId,
      storeName: input.storeName,
      batchNo: input.batchNo,
      expiryDate: input.expiryDate ?? null,
      availableQuantity: input.availableQuantity,
      unitPrice: input.unitPrice,
      needsBatch: input.needsBatch,
      needsExpiry: input.needsExpiry,
      isPharmacyItem: input.isPharmacyItem,
      isExpired: false,
      displayLabel: `${batchLabel} | ${expiryLabel} | متاح ${input.availableQuantity}`
    };
  }

  private enrichProduct(
    product: PharmacyInventoryProductOption,
    metadataMap: Map<string, PharmacyProductLookupItem>
  ): PharmacyInventoryProductOption {
    const metadata = metadataMap.get(product.itemCode.toLowerCase())
      || metadataMap.get(product.itemName.toLowerCase());

    if (!metadata) {
      return product;
    }

    const dosageForm = product.dosageForm || metadata.dosageForm || '';
    const strength = product.strength || metadata.strength || '';

    return {
      ...product,
      dosageForm,
      strength,
      batches: product.batches.map(batch => ({
        ...batch,
        dosageForm,
        strength
      })),
      preferredBatch: product.preferredBatch
        ? {
            ...product.preferredBatch,
            dosageForm,
            strength
          }
        : null
    };
  }

  private buildMetadataMap(items: PharmacyProductLookupItem[]): Map<string, PharmacyProductLookupItem> {
    const metadataMap = new Map<string, PharmacyProductLookupItem>();

    (items || []).forEach(item => {
      if (item.itemCode) {
        metadataMap.set(item.itemCode.toLowerCase(), item);
      }
      if (item.itemName) {
        metadataMap.set(item.itemName.toLowerCase(), item);
      }
    });

    return metadataMap;
  }

  private matchesSearch(product: PharmacyInventoryProductOption, searchTerm: string): boolean {
    return `${product.itemCode} ${product.itemName} ${product.storeName} ${product.dosageForm ?? ''} ${product.strength ?? ''}`
      .toLowerCase()
      .includes(searchTerm);
  }

  private compareBatchOptions(
    left: PharmacyInventoryBatchOption,
    right: PharmacyInventoryBatchOption
  ): number {
    const leftDate = this.getSortableDate(left.expiryDate);
    const rightDate = this.getSortableDate(right.expiryDate);

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    return right.availableQuantity - left.availableQuantity;
  }

  private getSortableDate(value?: string | Date | null): number {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  private isExpired(value?: string | Date | null, today?: Date): boolean {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return this.startOfDay(date).getTime() < (today ?? this.startOfDay(new Date())).getTime();
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDateOnly(value?: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      const normalized = `${value}`.trim();
      return normalized.length ? normalized : null;
    }

    return this.formatDate(date);
  }

  /**
   * When master purchase class (or future API fields) carries restriction metadata, surface it here.
   * Today most tenants omit it — UI falls back to manual DEA-style schedule until Backend persists clinical type.
   */
  public resolveMainPurchaseClassIdByItemCode(itemCode: string): Observable<string | null> {
    const code = `${itemCode ?? ''}`.trim().toLowerCase();
    if (!code) {
      return of(null);
    }
    return this.mainPurchaseClassService.getAll().pipe(
      map((masters) => {
        const master = (masters || []).find(
          (m) => `${m.referenceCode ?? ''}`.trim().toLowerCase() === code
        );
        const id = master?.id;
        return id ? `${id}`.trim() : null;
      })
    );
  }

  private mapPharmacyApiBatchToOption(
    batch: PharmacyItemBatchDto,
    storeId: string,
    productId: string,
    lookup: Pick<PharmacyProductLookupItem, 'itemCode' | 'itemName' | 'unitPrice'>
  ): PharmacyInventoryBatchOption {
    const selectionKey = `${storeId}::api::${batch.batchId}`;
    const batchLabel = batch.batchNo || 'بدون باتش';
    const expiryLabel = batch.expiryDate ? this.formatBatchApiDate(batch.expiryDate) : 'بدون صلاحية';

    return {
      selectionKey,
      productId,
      itemCode: lookup.itemCode,
      itemName: lookup.itemName,
      storeId,
      storeName: '',
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate ?? null,
      availableQuantity: Number(batch.availableQuantity ?? 0),
      unitPrice: Number(batch.unitPrice ?? lookup.unitPrice ?? 0),
      needsBatch: true,
      needsExpiry: !!batch.expiryDate,
      isPharmacyItem: true,
      isExpired: Boolean(batch.isExpired),
      displayLabel: `${batchLabel} | ${expiryLabel} | متاح ${batch.availableQuantity}`
    };
  }

  private formatBatchApiDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return `${value}`;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  private resolveRestrictionTypeFromMaster(
    masters: MainPurchaseClassModel[],
    productId: string
  ): PharmacyStockRestrictionType | null {
    const master = (masters || []).find(m => `${m.id ?? ''}` === `${productId ?? ''}`);
    if (!master) {
      return null;
    }
    const ext = master as unknown as { restrictionType?: string; clinicalRestriction?: string };
    const raw = ext.restrictionType ?? ext.clinicalRestriction;
    if (!raw) {
      return null;
    }
    const key = `${raw}`.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (key === 'controlled' || key === 'cs' || key === 'cde') {
      return 'controlled';
    }
    if (key === 'narcotic' || key === 'narcotics') {
      return 'narcotic';
    }
    if (key === 'prescription_only' || key === 'rx_only' || key === 'rxonly') {
      return 'prescription_only';
    }
    if (key === 'high_alert' || key === 'highalert' || key === 'look_alike') {
      return 'high_alert';
    }
    return null;
  }
}
