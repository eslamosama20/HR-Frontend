import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReadyPrescriptionDto, ReadyPrescriptionLineDto } from 'src/app/models/cashier/pharmacy-prescription-pos.model';
import { PharmacyApiService } from './pharmacy-api.service';

/**
 * Ready-prescription queue for POS: calls `GET /v1/cashier/ready-prescriptions`
 * and maps common response shapes to {@link ReadyPrescriptionDto}.
 */
@Injectable({
  providedIn: 'root'
})
export class PharmacyPickupService {
  constructor(private pharmacyApiService: PharmacyApiService) {}

  listReadyForPickup(storeDetailsId?: string, page = 1, pageSize = 50): Observable<ReadyPrescriptionDto[]> {
    return this.pharmacyApiService.getReadyPrescriptionsForCashier(page, pageSize, storeDetailsId).pipe(
      map((raw) => this.mapReadyPrescriptionsResponse(raw))
    );
  }

  private mapReadyPrescriptionsResponse(raw: unknown): ReadyPrescriptionDto[] {
    const rows = this.extractList(raw);
    return rows
      .map((row) => this.mapPickupRow(row))
      .filter((dto): dto is ReadyPrescriptionDto => {
        if (!dto) {
          return false;
        }
        if (dto.pickupStatus === 'picked_up') {
          return false;
        }
        return dto.pickupStatus === 'ready_for_pickup';
      });
  }

  private extractList(source: unknown): any[] {
    if (Array.isArray(source)) {
      return source;
    }
    const s = source as any;
    if (Array.isArray(s?.items)) {
      return s.items;
    }
    if (Array.isArray(s?.data)) {
      return s.data;
    }
    if (Array.isArray(s?.result?.items)) {
      return s.result.items;
    }
    return [];
  }

  private mapPickupRow(raw: any): ReadyPrescriptionDto | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const pickupId = `${raw.pickupId ?? raw.pickupID ?? raw.queueId ?? raw.id ?? raw.prescriptionId ?? ''}`.trim();
    const prescriptionId = `${raw.prescriptionId ?? raw.prescriptionID ?? raw.rxId ?? raw.id ?? ''}`.trim();
    const prescriptionNo = `${raw.prescriptionNo ?? raw.rxNo ?? raw.rxNumber ?? ''}`.trim();
    const patientName = `${raw.patientName ?? raw.patient?.name ?? ''}`.trim();
    const patientId = raw.patientId != null ? `${raw.patientId}` : raw.patient?.id != null ? `${raw.patient.id}` : undefined;

    const backendPickupStatus = `${raw.pickupStatus ?? raw.status ?? ''}`.trim().toLowerCase();
    const pickupStatus = this.normalizePickupStatusForUi(backendPickupStatus);

    const lineSources = this.extractList(raw.lines ?? raw.items ?? raw.pickupLines ?? raw.prescriptionItems);
    let lines: ReadyPrescriptionLineDto[] = lineSources.length
      ? lineSources.map((line) => this.mapPickupLine(line))
      : this.inferLinesFromFlatPickup(raw);

    if (!prescriptionId) {
      return null;
    }

    if (!lines.length && (backendPickupStatus === 'ready' || backendPickupStatus === 'pending' || !backendPickupStatus)) {
      lines = [
        this.mapPickupLine({
          prescriptionItemId: 'placeholder',
          itemId: '',
          name: (raw.patientName ? `وصفة — ${raw.patientName}` : 'وصفة جاهزة').trim() || 'وصفة جاهزة',
          quantity: 1,
          unitPrice: Number(raw.patientShareAmount ?? raw.totalAmount ?? 0) || 0
        })
      ];
    }

    if (!lines.length) {
      return null;
    }

      return {
      pickupId: pickupId || prescriptionId,
      prescriptionId,
      prescriptionNo: prescriptionNo || prescriptionId,
      patientName,
      patientId,
      pickupStatus,
      lines: this.applyTopLevelInsuranceShares(lines, raw)
    };
  }

  /**
   * Backend pickup lifecycle (report): pending | checked_out | cancelled.
   * POS UI expects: ready_for_pickup | picked_up.
   */
  private normalizePickupStatusForUi(backend: string): ReadyPrescriptionDto['pickupStatus'] {
    const v = backend.replace(/\s+/g, '_');
    if (v === 'checked_out' || v === 'picked_up' || v === 'delivered') {
      return 'picked_up';
    }
    if (v === 'cancelled' || v === 'canceled') {
      return 'cancelled';
    }
    if (!v || v === 'pending' || v === 'ready' || v === 'ready_for_pickup' || v === 'readyforpickup') {
      return 'ready_for_pickup';
    }
    return 'unknown';
  }

  private mapPickupLine(line: any): ReadyPrescriptionLineDto {
    const prescriptionItemId = `${line.prescriptionItemId ?? line.lineId ?? line.id ?? ''}`.trim();
    const itemId = `${line.itemId ?? line.mainPurchaseClassId ?? line.catalogItemId ?? ''}`.trim();
    const name = `${line.name ?? line.itemName ?? line.productName ?? ''}`.trim();
    const quantity = Number(line.quantity ?? line.qty ?? line.requestedQty ?? 0) || 0;
    const unitPrice = Number(line.unitPrice ?? line.price ?? 0) || 0;
    const taxPercentage = line.taxPercentage != null ? Number(line.taxPercentage) : undefined;
    const batchNo = line.batchNo ?? line.batchNumber ?? null;
    const expiryDate = line.expiryDate ?? line.expiry ?? null;
    const patientShare = line.patientShare != null ? Number(line.patientShare) : line.payable != null ? Number(line.payable) : null;
    const insuranceShare = line.insuranceShare != null ? Number(line.insuranceShare) : line.insurance != null ? Number(line.insurance) : null;
    const allocationStatus = this.normalizeAllocationUi(line.allocationStatus ?? line.lineStatus);

    return {
      prescriptionItemId: prescriptionItemId || `line-${itemId}`,
      itemId,
      name: name || `Item ${itemId}`,
      quantity,
      unitPrice,
      taxPercentage,
      batchNo,
      expiryDate,
      patientShare,
      insuranceShare,
      allocationStatus
    };
  }

  private inferLinesFromFlatPickup(raw: any): ReadyPrescriptionLineDto[] {
    const qty = Number(raw.quantity ?? raw.lineQuantity ?? 0);
    if (!qty) {
      return [];
    }
    return [
      this.mapPickupLine({
        prescriptionItemId: raw.prescriptionItemId,
        itemId: raw.itemId ?? raw.mainPurchaseClassId,
        name: raw.itemName ?? raw.name,
        quantity: qty,
        unitPrice: raw.unitPrice ?? raw.price,
        taxPercentage: raw.taxPercentage,
        batchNo: raw.batchNo,
        expiryDate: raw.expiryDate,
        patientShare: raw.patientShare ?? raw.payable,
        insuranceShare: raw.insuranceShare,
        allocationStatus: raw.allocationStatus
      })
    ];
  }

  private normalizeAllocationUi(value: unknown): ReadyPrescriptionLineDto['allocationStatus'] {
    const v = `${value ?? ''}`.trim().toLowerCase();
    if (v === 'allocated' || v === 'reservation' || v === 'committed') {
      return 'allocated';
    }
    if (v === 'ready' || v === 'dispensed' || v === 'complete') {
      return 'ready';
    }
    return 'pending';
  }

  private applyTopLevelInsuranceShares(lines: ReadyPrescriptionLineDto[], raw: any): ReadyPrescriptionLineDto[] {
    const hasLineShares = lines.some((line) => line.patientShare != null || line.insuranceShare != null);
    if (hasLineShares) {
      return lines;
    }

    const patientShare = Number(raw?.financials?.patientShare ?? raw?.patientShareAmount ?? raw?.patientShare ?? 0);
    const insuranceShare = Number(raw?.financials?.insuranceShare ?? raw?.insuranceCoveredAmount ?? raw?.insuranceShare ?? 0);
    if (!patientShare && !insuranceShare) {
      return lines;
    }

    const grossTotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    return lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      const ratio = grossTotal > 0 ? lineTotal / grossTotal : 1 / lines.length;
      return {
        ...line,
        patientShare: patientShare ? Math.round(patientShare * ratio * 100) / 100 : null,
        insuranceShare: insuranceShare ? Math.round(insuranceShare * ratio * 100) / 100 : null
      };
    });
  }
}
