import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import {
  PharmacyAllocationLine,
  PharmacyAllocationOrderInput,
  PharmacyAllocationPreparationResult,
  PharmacyAllocationProcessStatus,
  PharmacyAllocationState,
  PharmacyAllocationValidationIssue
} from 'src/app/models/cashier/pharmacy-allocation.model';
import { PharmacyInventoryBatchOption } from 'src/app/models/cashier/pharmacy-inventory.model';
import { PharmacyInventoryService } from './pharmacy-inventory.service';
import { buildInventoryTrackingKey, normalizeBatchNo } from 'src/app/utils/inventory-tracking.utils';

interface ResolvedAllocationLine {
  line: PharmacyAllocationLine;
  trackingKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyAllocationService {
  private readonly mode = 'payload-preparation' as const;

  constructor(private pharmacyInventoryService: PharmacyInventoryService) {}

  prepareDispenseAllocation(order: PharmacyAllocationOrderInput): Observable<PharmacyAllocationPreparationResult> {
    const topLevelIssues = this.buildOrderIssues(order);
    if (!order.items?.length) {
      return of(this.buildResult(order, [], topLevelIssues));
    }

    return forkJoin(order.items.map(item => this.resolveLine(item))).pipe(
      map(lines => {
        this.applyGroupedQuantityValidation(lines);
        return this.buildResult(order, lines, topLevelIssues);
      })
    );
  }

  private resolveLine(item: PharmacyAllocationOrderInput['items'][number]): Observable<ResolvedAllocationLine> {
    const line = this.createLine(item);
    const rawProductId = `${item.mainPurchaseClassId ?? ''}`.trim();
    const storeId = `${item.storeId ?? ''}`.trim();

    const resolveId$ = rawProductId
      ? of(rawProductId)
      : this.pharmacyInventoryService.resolveMainPurchaseClassIdByItemCode(item.itemCode);

    return resolveId$.pipe(
      switchMap((resolvedProductId) => {
        const productId = (resolvedProductId ?? '').trim();
        line.mainPurchaseClassId = productId;

        if (!productId) {
          line.validations.push(this.createIssue('missing-product', `الصنف ${item.itemName} لا يملك مرجع مخزون صالح.`));
        }

        if (!storeId) {
          line.validations.push(this.createIssue('missing-store', `الصنف ${item.itemName} غير مرتبط بمخزن صرف.`));
        }

        if (line.dispensedQuantity <= 0) {
          line.validations.push(this.createIssue('invalid-quantity', `كمية الصرف للصنف ${item.itemName} يجب أن تكون أكبر من صفر.`));
        }

        if (line.needsBatch && !normalizeBatchNo(line.batchNo)) {
          line.validations.push(this.createIssue('batch-required', `الصنف ${item.itemName} يحتاج Batch صالح قبل التأكيد.`));
        }

        if (line.needsExpiry && !line.needsBatch && !line.expiryDate) {
          line.validations.push(this.createIssue('expiry-required', `الصنف ${item.itemName} يحتاج تاريخ صلاحية صالح قبل التأكيد.`));
        }

        if (!line.needsBatch && this.isExpired(line.expiryDate)) {
          line.validations.push(this.createIssue('expired-batch', `الـ Batch المختار للصنف ${item.itemName} منتهي الصلاحية.`));
        }

        if (!productId || !storeId) {
          line.status = 'blocked';
          return of({
            line,
            trackingKey: this.buildTrackingKey(productId, storeId, line.batchNo, line.expiryDate)
          });
        }

        return this.pharmacyInventoryService.findMatchingBatch({
          productId,
          storeId,
          batchNo: line.batchNo,
          expiryDate: line.expiryDate,
          needsBatch: line.needsBatch,
          needsExpiry: line.needsExpiry
        }).pipe(
          map(batch => this.applyBatchMatch(line, batch))
        );
      })
    );
  }

  private applyBatchMatch(
    line: PharmacyAllocationLine,
    batch: PharmacyInventoryBatchOption | null
  ): ResolvedAllocationLine {
    if (!batch) {
      line.validations.push(this.createIssue('batch-not-found', `تعذر العثور على الـ Batch الحقيقي للصنف ${line.itemName} داخل مخزن الصيدلية.`));
      line.status = 'blocked';
      return {
        line,
        trackingKey: this.buildTrackingKey(line.mainPurchaseClassId, line.storeId, line.batchNo, line.expiryDate)
      };
    }

    line.storeId = batch.storeId;
    line.storeName = batch.storeName;
    line.batchNo = batch.batchNo ?? null;
    line.expiryDate = this.toDateOnly(batch.expiryDate);
    line.availableQuantity = Number(batch.availableQuantity ?? 0);

    if (batch.isExpired || this.isExpired(batch.expiryDate)) {
      line.validations.push(this.createIssue('expired-batch', `الـ Batch المختار للصنف ${line.itemName} منتهي الصلاحية.`));
    }

    if (line.dispensedQuantity > line.availableQuantity) {
      line.validations.push(this.createIssue(
        'insufficient-quantity',
        `الكمية المطلوبة للصنف ${line.itemName} أكبر من المتاح في الـ Batch المختار.`
      ));
    }

    line.status = line.validations.length ? 'blocked' : 'prepared';

    return {
      line,
      trackingKey: this.buildTrackingKey(batch.productId, batch.storeId, batch.batchNo, this.toDateOnly(batch.expiryDate))
    };
  }

  private applyGroupedQuantityValidation(lines: ResolvedAllocationLine[]): void {
    const groupedLines = new Map<string, ResolvedAllocationLine[]>();

    lines.forEach(line => {
      const existing = groupedLines.get(line.trackingKey);
      if (existing) {
        existing.push(line);
        return;
      }
      groupedLines.set(line.trackingKey, [line]);
    });

    groupedLines.forEach(group => {
      const availableQuantity = Number(group[0]?.line.availableQuantity ?? 0);
      const requestedQuantity = group.reduce((sum, line) => sum + line.line.dispensedQuantity, 0);

      if (requestedQuantity <= availableQuantity) {
        return;
      }

      group.forEach(line => {
        line.line.validations.push(this.createIssue(
          'insufficient-quantity',
          `إجمالي الكمية المطلوبة على نفس الـ Batch للصنف ${line.line.itemName} يتجاوز المتاح حاليًا.`
        ));
        line.line.status = 'blocked';
      });
    });
  }

  private buildResult(
    order: PharmacyAllocationOrderInput,
    lines: ResolvedAllocationLine[],
    topLevelIssues: PharmacyAllocationValidationIssue[]
  ): PharmacyAllocationPreparationResult {
    const preparedAt = new Date().toISOString();
    const resolvedLines = lines.map(item => item.line);
    const errors = [...topLevelIssues, ...resolvedLines.flatMap(line => line.validations)].map(issue => issue.message);
    const status: PharmacyAllocationProcessStatus = errors.length ? 'failed' : 'prepared';
    const payload = status === 'prepared'
      ? {
          prescriptionId: order.prescriptionId,
          rxNo: order.rxNo,
          allocationMode: this.mode,
          paymentMethod: order.paymentMethod,
          notes: order.notes,
          createdAt: preparedAt,
          totalRequestedQuantity: resolvedLines.reduce((sum, line) => sum + line.requestedQuantity, 0),
          totalDispensedQuantity: resolvedLines.reduce((sum, line) => sum + line.dispensedQuantity, 0),
          lines: resolvedLines.map(line => ({
            prescriptionItemId: line.prescriptionItemId,
            itemId: line.mainPurchaseClassId ?? '',
            mainPurchaseClassId: line.mainPurchaseClassId ?? '',
            itemCode: line.itemCode,
            itemName: line.itemName,
            storeId: line.storeId ?? '',
            storeName: line.storeName,
            batchNo: line.batchNo ?? null,
            expiryDate: line.expiryDate ?? null,
            requestedQuantity: line.requestedQuantity,
            dispensedQuantity: line.dispensedQuantity,
            availableQuantity: line.availableQuantity,
            needsBatch: line.needsBatch,
            needsExpiry: line.needsExpiry,
            allocationMode: this.mode
          }))
        }
      : null;

    const state: PharmacyAllocationState = {
      allocationMode: this.mode,
      status,
      backendCommitted: false,
      preparedAt,
      errorMessages: errors,
      payload,
      lines: resolvedLines
    };

    return {
      canProceed: status === 'prepared',
      mode: this.mode,
      errors,
      state,
      summary: {
        totalLines: resolvedLines.length,
        totalRequestedQuantity: resolvedLines.reduce((sum, line) => sum + line.requestedQuantity, 0),
        totalDispensedQuantity: resolvedLines.reduce((sum, line) => sum + line.dispensedQuantity, 0),
        distinctStores: new Set(resolvedLines.map(line => line.storeId).filter(Boolean)).size,
        distinctBatches: new Set(
          resolvedLines
            .map(line => this.buildTrackingKey(line.mainPurchaseClassId, line.storeId, line.batchNo, line.expiryDate))
            .filter(Boolean)
        ).size
      }
    };
  }

  private buildOrderIssues(order: PharmacyAllocationOrderInput): PharmacyAllocationValidationIssue[] {
    const issues: PharmacyAllocationValidationIssue[] = [];
    const status = `${order.status ?? ''}`.toLowerCase();

    if (!order.items?.length) {
      issues.push(this.createIssue('empty-order', 'لا يمكن تأكيد الصرف لوصفة بدون أصناف.'));
    }

    if (status === 'ready' || status === 'delivered') {
      issues.push(this.createIssue('already-dispensed', `الوصفة ${order.rxNo} سبق تجهيزها أو صرفها بالفعل.`));
    }

    if (status === 'cancelled') {
      issues.push(this.createIssue('invalid-status', `الوصفة ${order.rxNo} ملغاة ولا يمكن تنفيذ صرف مخزني لها.`));
    }

    return issues;
  }

  private createLine(item: PharmacyAllocationOrderInput['items'][number]): PharmacyAllocationLine {
    const requestedQuantity = this.normalizeQuantity(item.requestedQuantity);

    return {
      prescriptionItemId: item.prescriptionItemId,
      mainPurchaseClassId: item.mainPurchaseClassId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      storeId: item.storeId,
      storeName: item.storeName,
      batchNo: normalizeBatchNo(item.batchNo),
      expiryDate: this.toDateOnly(item.expiryDate),
      requestedQuantity,
      dispensedQuantity: requestedQuantity,
      availableQuantity: Number(item.availableQuantity ?? 0),
      needsBatch: item.needsBatch !== false,
      needsExpiry: item.needsExpiry !== false,
      status: 'pending',
      validations: []
    };
  }

  private normalizeQuantity(value: number): number {
    const quantity = Number(value ?? 0);
    return Number.isFinite(quantity) ? quantity : 0;
  }

  private createIssue(
    code: PharmacyAllocationValidationIssue['code'],
    message: string
  ): PharmacyAllocationValidationIssue {
    return { code, message };
  }

  private buildTrackingKey(
    productId?: string,
    storeId?: string,
    batchNo?: string | null,
    expiryDate?: string | null
  ): string {
    return `${storeId ?? 'no-store'}::${buildInventoryTrackingKey({
      productId,
      batchNo,
      expiryDate
    })}`;
  }

  private toDateOnly(value?: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      const normalized = `${value}`.trim();
      return normalized.length ? normalized : null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isExpired(value?: string | Date | null): boolean {
    if (!value) {
      return false;
    }

    let year: number;
    let month: number;
    let day: number;

    if (value instanceof Date) {
      year = value.getFullYear();
      month = value.getMonth() + 1;
      day = value.getDate();
    } else {
      const s = `${value}`.trim();
      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        const date = new Date(s);
        if (Number.isNaN(date.getTime())) {
          return false;
        }
        year = date.getFullYear();
        month = date.getMonth() + 1;
        day = date.getDate();
      }
    }

    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const normalizedDate = new Date(year, month - 1, day);
    return normalizedDate.getTime() < normalizedToday.getTime();
  }
}
