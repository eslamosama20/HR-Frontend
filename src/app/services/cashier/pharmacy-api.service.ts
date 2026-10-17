import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { isGuidString } from 'src/app/core/types/ids.types';
import { PharmacyAllocationPayload } from 'src/app/models/cashier/pharmacy-allocation.model';

export type PharmacyPrescriptionStatus = 'new' | 'review' | 'dispensing' | 'ready' | 'delivered' | 'cancelled';
export type PharmacyPriority = 'normal' | 'urgent';
export type PharmacyPaymentType = 'cash' | 'insurance';
export type PharmacyInsuranceStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface PharmacyPrescriptionAttachment {
  id: number;
  fileName: string;
  fileSize: string;
  uploadDate: Date;
  type: 'rx_image' | 'other';
}

export interface PharmacyPrescriptionItem {
  id: number;
  prescriptionItemId?: string;
  /** Main purchase / inventory Guid when provided by API (distinct from numeric line id). */
  mainPurchaseClassId?: string;
  itemCode?: string;
  itemName: string;
  dosageForm: string;
  strength: string;
  storeId?: string;
  storeDetailsId?: string;
  storeName?: string;
  batchId?: string;
  batchNo?: string;
  expiryDate?: string;
  availableQuantity?: number;
  unitPrice: number;
  requestedQuantity: number;
  dispensedQuantity: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  instructions: string;
  allowAlternative: boolean;
  isControlled?: boolean;
  status: 'pending' | 'dispensed' | 'shortage';
}

export interface PharmacyPrescriptionOrder {
  id: number;
  /** Raw prescription id from API (GUID or numeric string) for URL calls when numeric `id` is not reliable. */
  serverPrescriptionId?: string;
  rxNo: string;
  patientName: string;
  doctorName: string;
  paymentType: PharmacyPaymentType;
  insuranceName: string;
  insuranceStatus: PharmacyInsuranceStatus;
  insuranceDetails?: {
    memberNo: string;
    approvalNo: string;
    coveragePercentage: number;
    patientSharePercentage: number;
    /** Guid string preferred; legacy APIs may expose a numeric id. */
    insuranceCompanyId?: string | number;
  };
  financials: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    insuranceCovered: number;
    patientPayable: number;
    grandTotal: number;
  };
  dispensedBy: string;
  itemsCount: number;
  items: PharmacyPrescriptionItem[];
  priority: PharmacyPriority;
  status: PharmacyPrescriptionStatus;
  createdAt: Date;
  notes: string;
  attachments: PharmacyPrescriptionAttachment[];
}

/**
 * Row from `GET .../pharmacy/items/lookup`. `id` is the backend FNV-1a int for `itemCode` (not MainPurchaseClass Guid).
 */
export interface PharmacyProductLookupItem {
  id: number;
  itemCode: string;
  itemName: string;
  dosageForm: string;
  strength: string;
  storeId?: string;
  storeName: string;
  availableQuantity: number;
  unitPrice: number;
  retailPrice?: number;
  wholesalePrice?: number;
  bulkPrice?: number;
  availabilityStatus?: string;
  isControlled?: boolean;
  requiresBatch?: boolean;
  scientificName?: string;
  mainPurchaseClassId?: string;
  defaultBatchNo?: string;
  defaultExpiryDate?: string;
  batchNo?: string;
  expiryDate?: string;
}

export interface PharmacyItemBatchDto {
  batchId: string;
  batchNo: string;
  expiryDate: string;
  availableQuantity: number;
  unitPrice: number;
  supplierName?: string | null;
  receivedDate?: string | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  status?: string;
}

export interface PharmacyItemBatchesResponse {
  itemId: number;
  itemName?: string;
  batches: PharmacyItemBatchDto[];
}

export interface PharmacyCheckStockResponse {
  isAvailable: boolean;
  availableQty: number;
  availabilityStatus: string;
  alternatives: unknown[];
}

export interface PharmacyInteractionAlert {
  firstDrug: string;
  secondDrug: string;
  severity: 'high' | 'medium';
  message: string;
}

interface PagedResult<T> {
  items: T[];
  total: number;
}

/**
 * Normalized lines for `POST /v1/pharmacy/prescriptions/{id}/allocate-and-dispense`.
 * Backend may deduct stock, create a reservation, or only persist/audit the payload (`commitMode` in response).
 */
export interface PharmacyDispenseLineCommitDto {
  prescriptionId: number | string;
  prescriptionItemId: number;
  /** Inventory item / product key (here: mainPurchaseClassId). */
  itemId: string;
  batchNo: string | null;
  storeId: string;
  quantity: number;
  expiryDate: string | null;
}

export type PharmacyAllocateDispenseCommitMode = 'deduction' | 'reservation' | 'payload_logged' | 'unknown';

export interface PharmacyAllocateDispenseResult {
  allocationReferenceId?: string | null;
  commitMode: PharmacyAllocateDispenseCommitMode;
  prescriptionStatus?: PharmacyPrescriptionStatus;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyApiService {
  private readonly baseApi = environment.server_urls[environment.active_server].baseApi;
  private readonly pharmacyApi = `${this.baseApi}v1/pharmacy`;
  private readonly cashierApi = `${this.baseApi}v1/cashier`;

  constructor(private http: HttpClient) {}

  getPrescriptions(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  } = {}): Observable<PagedResult<PharmacyPrescriptionOrder>> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 1).toString())
      .set('size', (params.pageSize ?? 50).toString())
      .set('pageSize', (params.pageSize ?? 50).toString());

    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http
      .get<any>(`${this.pharmacyApi}/prescriptions`, { params: httpParams })
      .pipe(
        map((response) => {
          const items = this.extractItems(response).map((item: any) => this.mapPrescription(item));
          const total = Number(response?.totalCount ?? response?.total ?? response?.count ?? items.length) || items.length;
          return { items, total };
        })
      );
  }

  getPrescriptionById(id: number | string): Observable<PharmacyPrescriptionOrder> {
    return this.http
      .get<any>(`${this.pharmacyApi}/prescriptions/${id}`)
      .pipe(map((response) => this.mapPrescription(response)));
  }

  updatePrescriptionStatus(id: number | string, status: PharmacyPrescriptionStatus, notes?: string): Observable<any> {
    return this.http.patch(`${this.pharmacyApi}/prescriptions/${id}/status`, { status, notes: notes || '' });
  }

  markPrescriptionReady(id: number | string, notes?: string, confirmedBy?: string): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/prescriptions/${id}/ready`, {
      notes: notes || '',
      confirmedBy: confirmedBy || 'pharmacist-ui'
    });
  }

  pollPrescriptionNphiesStatus(id: number | string): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/prescriptions/${id}/poll-nphies`, {});
  }

  submitSfdaTrace(payload: {
    prescriptionId?: number | string;
    itemId?: number | string;
    itemCode?: string;
    batchNo?: string | null;
    quantity?: number;
    storeDetailsId?: string;
    eventType?: string;
    [key: string]: unknown;
  }): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/sfda/trace`, payload);
  }

  /**
   * Atomic pharmacy commit: validated allocation payload + per-line batch/store/qty.
   * Server should validate again, apply deduction or reservation (or official payload logging), then set prescription to ready (or return pending if async).
   * Contract: body.lines[] = { prescriptionId, prescriptionItemId, itemId, batchNo, storeId, quantity, expiryDate }.
   */
  allocateAndDispensePrescription(
    prescriptionId: number | string,
    request: {
      notes?: string;
      confirmedBy?: string;
      allocationPayload: PharmacyAllocationPayload;
    }
  ): Observable<PharmacyAllocateDispenseResult> {
    const allocationPayload = request.allocationPayload;
    const lines: PharmacyDispenseLineCommitDto[] = allocationPayload.lines.map((l) => ({
      prescriptionId,
      prescriptionItemId: l.prescriptionItemId,
      itemId: (l.itemId || l.mainPurchaseClassId || '').trim(),
      batchNo: l.batchNo ?? null,
      storeId: `${l.storeId ?? ''}`.trim(),
      quantity: Number(l.dispensedQuantity ?? 0),
      expiryDate: l.expiryDate ?? null
    }));

    return this.http
      .post<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/allocate-and-dispense`, {
        prescriptionId,
        notes: request.notes ?? '',
        confirmedBy: request.confirmedBy ?? 'pharmacist-ui',
        lines,
        allocationPayload
      })
      .pipe(map((raw) => this.mapAllocateDispenseResult(raw)));
  }

  sendToPos(id: number | string, posTerminalId: string, cashierUserId: string): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/prescriptions/${id}/send-to-pos`, {
      posTerminalId,
      cashierUserId
    });
  }

  cancelPrescription(id: number | string, reason: string): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/prescriptions/${id}/cancel`, { reason });
  }

  updateInsuranceInfo(id: number | string, payload: {
    insuranceCompanyId?: number | string;
    insuranceName?: string;
    memberNo: string;
    approvalNo: string;
    coveragePercentage: number;
    patientSharePercentage: number;
    insuranceCoveredAmount?: number;
    patientShareAmount?: number;
    insurancePolicyNo?: string;
    status: 'pending' | 'approved' | 'rejected';
  }): Observable<any> {
    return this.http.put(`${this.pharmacyApi}/prescriptions/${id}`, {
      insuranceEnabled: true,
      paymentType: 'Insurance',
      insuranceName: payload.insuranceName,
      insuranceCompanyId: payload.insuranceCompanyId || null,
      insuranceMemberNo: payload.memberNo,
      insurancePolicyNo: payload.insurancePolicyNo || '',
      insuranceApprovalNo: payload.approvalNo,
      insuranceCoveragePercentage: payload.coveragePercentage,
      insurancePatientSharePercentage: payload.patientSharePercentage,
      insuranceCoveredAmount: payload.insuranceCoveredAmount,
      patientShareAmount: payload.patientShareAmount,
      insuranceApprovalStatus: payload.status
    });
  }

  /**
   * POST .../pharmacy/insurance/verify — `itemId` values are Guid strings (MainPurchaseClass id), per backend Postman contract.
   */
  verifyInsuranceCoverage(payload: {
    insuranceCompanyId: string;
    memberNo: string;
    items: Array<{ itemId: string; quantity: number; unitPrice: number }>;
  }): Observable<any> {
    return this.http.post<any>(`${this.pharmacyApi}/insurance/verify`, payload);
  }

  submitInsuranceApproval(prescriptionId: string | number, approvalNo: string): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/insurance/submit-approval`, {
      prescriptionId,
      approvalNo
    });
  }

  getAttachments(prescriptionId: number | string): Observable<PharmacyPrescriptionAttachment[]> {
    return this.http
      .get<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/attachments`)
      .pipe(map((response) => this.extractItems(response).map((item: any) => this.mapAttachment(item))));
  }

  uploadAttachment(prescriptionId: number | string, file: File, notes = ''): Observable<PharmacyPrescriptionAttachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (notes) {
      formData.append('notes', notes);
    }

    return this.http
      .post<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/attachments`, formData)
      .pipe(map((response) => this.mapAttachment(response)));
  }

  /**
   * GET .../pharmacy/items/lookup — query names match Postman (`searchTerm`, `storeId`, `isControlled`, `maxResults`).
   */
  searchItems(
    searchTerm: string,
    storeId?: string,
    options?: { isControlled?: boolean; maxResults?: number }
  ): Observable<PharmacyProductLookupItem[]> {
    const maxResults = options?.maxResults ?? 20;
    let params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('isControlled', String(options?.isControlled ?? false))
      .set('maxResults', maxResults.toString());

    if (storeId) {
      params = params.set('storeId', storeId);
    }

    return this.http.get<any>(`${this.pharmacyApi}/items/lookup`, { params }).pipe(
      map((response) =>
        this.extractItems(response).map((item: any) => ({
          id: Number(item.itemId ?? item.id ?? 0),
          itemCode: item.itemCode ?? item.code ?? '',
          itemName: (item.tradeName ?? item.itemName ?? item.name ?? '').trim(),
          dosageForm: item.dosageForm ?? '',
          strength: item.strength ?? '',
          scientificName: item.scientificName,
          storeId: item.storeDetailsId ?? item.storeId ?? undefined,
          storeName: item.storeName ?? item.storeDetailsName ?? item.storeArabicName ?? item.arabicName ?? item.nameAr ?? item.storeEnglishName ?? item.englishName ?? '',
          availableQuantity: Number(item.stock ?? item.availableQuantity ?? item.quantityAvailable ?? 0),
          unitPrice: Number(item.unitPrice ?? item.retailPrice ?? item.sellingPrice ?? item.salePrice ?? item.price ?? item.lastPrice ?? item.wholesalePrice ?? 0),
          retailPrice: Number(item.retailPrice ?? item.unitPrice ?? 0),
          wholesalePrice: Number(item.wholesalePrice ?? 0),
          bulkPrice: Number(item.bulkPrice ?? item.wholesalePrice ?? 0),
          availabilityStatus: item.availabilityStatus,
          isControlled: Boolean(item.isControlled),
          requiresBatch: item.requiresBatch !== false,
          mainPurchaseClassId: item.mainPurchaseClassId,
          batchNo: item.defaultBatchNo ?? item.batchNo,
          expiryDate: item.defaultExpiryDate ?? item.expiryDate
        }))
      )
    );
  }

  /** GET .../pharmacy/items/{itemId}/batches — `itemId` is FNV int from lookup. */
  getItemBatches(itemId: number, storeId: string, activeOnly = true): Observable<PharmacyItemBatchesResponse> {
    const params = new HttpParams().set('storeId', storeId).set('activeOnly', String(activeOnly));
    return this.http.get<PharmacyItemBatchesResponse>(
      `${this.pharmacyApi}/items/${itemId}/batches`,
      { params }
    );
  }

  /** POST .../pharmacy/items/check-stock */
  checkStock(payload: {
    itemId: number;
    storeId: string;
    requestedQty: number;
  }): Observable<PharmacyCheckStockResponse> {
    return this.http.post<PharmacyCheckStockResponse>(`${this.pharmacyApi}/items/check-stock`, payload);
  }

  checkDrugInteractions(itemIds: number[], patientId = 1): Observable<PharmacyInteractionAlert[]> {
    return this.http
      .post<any>(`${this.pharmacyApi}/prescriptions/check-interactions`, {
        itemIds,
        patientId
      })
      .pipe(
        map((response) => this.extractItems(response).map((item: any) => ({
          firstDrug: item.firstDrug ?? item.drugA ?? '',
          secondDrug: item.secondDrug ?? item.drugB ?? '',
          severity: (item.severity ?? 'medium') as 'high' | 'medium',
          message: item.message ?? item.description ?? ''
        })))
      );
  }

  getReadyPrescriptionsForCashier(page = 1, pageSize = 50, storeDetailsId?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (storeDetailsId) {
      params = params.set('storeDetailsId', storeDetailsId);
    }
    return this.http.get(`${this.cashierApi}/ready-prescriptions`, { params });
  }

  /**
   * Stable numeric key for UI/state maps when API returns non-numeric ids (e.g. GUID).
   */
  private normalizePrescriptionNumericId(raw: unknown): number {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    const s = `${raw ?? ''}`;
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    const abs = Math.abs(h);
    return abs > 0 ? abs : 1;
  }

  private mapPrescription(source: any): PharmacyPrescriptionOrder {
    const items = this.extractItems(source?.items).map((item: any) => this.mapPrescriptionItem(item));
    const subtotal = Number(source?.financials?.subtotal ?? source?.subtotal ?? items.reduce((sum, item) => sum + (item.unitPrice * item.requestedQuantity), 0));
    const totalTax = Number(source?.financials?.totalTax ?? source?.taxAmount ?? items.reduce((sum, item) => sum + item.taxAmount, 0));
    const totalDiscount = Number(source?.financials?.totalDiscount ?? source?.discountAmount ?? items.reduce((sum, item) => sum + item.discountAmount, 0));
    const grandTotal = Number(source?.financials?.grandTotal ?? source?.totalAmount ?? (subtotal + totalTax - totalDiscount));
    const rawPrescriptionId = source?.id;
    const rxNo = source?.rxNo ?? source?.prescriptionNo ?? '';
    const serverPrescriptionId = `${rawPrescriptionId ?? rxNo ?? ''}`.trim() || undefined;

    const insuranceEnabled = Boolean(source?.insuranceEnabled ?? source?.hasInsurance ?? source?.paymentType === 'Insurance');
    const approvalNo = `${source?.insuranceApprovalNo ?? source?.insurance?.approvalNo ?? source?.insuranceDetails?.approvalNo ?? ''}`.trim();
    const rawStatus = `${source?.insuranceStatus ?? source?.insuranceApprovalStatus ?? source?.insurance?.status ?? ''}`.toLowerCase();
    const isApproved = Boolean(approvalNo || rawStatus === 'approved');
    const insuranceStatus: PharmacyInsuranceStatus = isApproved ? 'approved' : (insuranceEnabled ? 'pending' : 'none');

    const insuranceCovered = (insuranceEnabled && isApproved)
      ? Number(source?.financials?.insuranceCovered ?? source?.insuranceCoveredAmount ?? 0)
      : 0;
    const patientPayable = (insuranceEnabled && isApproved)
      ? Number(source?.financials?.patientPayable ?? source?.patientShareAmount ?? Math.max(0, grandTotal - insuranceCovered))
      : grandTotal;

    return {
      id: this.normalizePrescriptionNumericId(rawPrescriptionId || rxNo),
      serverPrescriptionId,
      rxNo,
      patientName: source?.patientName ?? source?.patient?.name ?? '',
      doctorName: source?.doctorName ?? source?.doctor?.name ?? '',
      paymentType: (insuranceEnabled ? 'insurance' : (source?.paymentType ?? 'cash').toString().toLowerCase()) as PharmacyPaymentType,
      insuranceName: source?.insuranceName ?? source?.insurance?.companyName ?? 'نقدي',
      insuranceStatus,
      insuranceDetails: insuranceEnabled || source?.insurance || source?.insuranceDetails
        ? {
          memberNo: source?.insuranceMemberNo ?? source?.insurance?.memberNo ?? source?.insuranceDetails?.memberNo ?? '',
          approvalNo,
          coveragePercentage: Number(source?.insuranceCoveragePercentage ?? source?.insurance?.coveragePercentage ?? source?.insuranceDetails?.coveragePercentage ?? 0),
          patientSharePercentage: Number(source?.insurancePatientSharePercentage ?? source?.insurance?.patientSharePercentage ?? source?.insuranceDetails?.patientSharePercentage ?? 0),
          insuranceCompanyId: this.normalizeInsuranceCompanyId(
            source?.insurance?.insuranceCompanyId ??
              source?.insuranceDetails?.insuranceCompanyId ??
              source?.insuranceCompanyId
          )
        }
        : undefined,
      financials: {
        subtotal,
        totalDiscount,
        totalTax,
        insuranceCovered,
        patientPayable,
        grandTotal
      },
      dispensedBy: source?.dispensedBy ?? source?.createdByName ?? source?.preparedBy ?? source?.userName ?? '',
      itemsCount: Number(source?.itemsCount ?? items.length),
      items,
      priority: (source?.priority ?? 'normal') as PharmacyPriority,
      status: (source?.status ?? 'new') as PharmacyPrescriptionStatus,
      createdAt: new Date(source?.createdAt ?? source?.issueDate ?? Date.now()),
      notes: source?.notes ?? '',
      attachments: this.extractItems(source?.attachments).map((attachment: any) => this.mapAttachment(attachment))
    };
  }

  /**
   * Product Guid for pharmacy stock / insurance verify (Postman uses string Guids).
   * Prefer explicit `mainPurchaseClassId`; otherwise use `itemId` only when it is a Guid (not an int hash).
   */
  private normalizeInsuranceCompanyId(raw: unknown): string | number | undefined {
    if (raw === null || raw === undefined || raw === '') {
      return undefined;
    }
    if (typeof raw === 'string') {
      return raw.trim();
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    return undefined;
  }

  private extractMainPurchaseClassId(source: any): string | undefined {
    const explicit = source?.mainPurchaseClassId ?? source?.inventoryItemId ?? source?.productId;
    if (typeof explicit === 'string' && isGuidString(explicit)) {
      return explicit.trim();
    }
    const itemId = source?.itemId;
    if (typeof itemId === 'string' && isGuidString(itemId)) {
      return itemId.trim();
    }
    return undefined;
  }

  private mapPrescriptionItem(source: any): PharmacyPrescriptionItem {
    const requestedQuantity = Number(source?.requestedQuantity ?? source?.requestedQty ?? source?.quantity ?? 0);
    const unitPrice = Number(source?.unitPrice ?? source?.price ?? 0);
    const discountAmount = Number(source?.discountAmount ?? 0);
    const taxAmount = Number(source?.taxAmount ?? 0);
    const lineKey = source?.prescriptionItemId ?? source?.lineId ?? source?.id;
    let id = Number(lineKey);
    if (!Number.isFinite(id) || id <= 0) {
      id = this.normalizePrescriptionNumericId(lineKey);
    }

    const mainPurchaseClassId = this.extractMainPurchaseClassId(source);
    const storeDetailsId = this.normalizeNullableString(source?.storeDetailsId);
    const storeId = storeDetailsId || this.normalizeNullableString(source?.storeId);
    const availabilityStatus = `${source?.availabilityStatus ?? ''}`.trim().toLowerCase();
    const availableQuantity = Number(
      source?.availableQuantity ??
      source?.availableQty ??
      source?.quantityAvailable ??
      source?.availableStock ??
      source?.stock ??
      source?.onHandQty ??
      (availabilityStatus === 'available' ? requestedQuantity : 0)
    );

    return {
      id,
      prescriptionItemId: typeof lineKey === 'string' ? lineKey.trim() : undefined,
      mainPurchaseClassId,
      itemCode: source?.itemCode ?? source?.code ?? '',
      itemName: source?.itemName ?? source?.name ?? '',
      dosageForm: source?.dosageForm ?? '',
      strength: source?.strength ?? '',
      storeId: storeId || undefined,
      storeDetailsId: storeDetailsId || undefined,
      storeName: source?.storeName ?? source?.storeDetailsName ?? source?.storeCode ?? storeId ?? '',
      batchId: source?.batchId ?? undefined,
      batchNo: source?.batchNo ?? '',
      expiryDate: source?.expiryDate ?? '',
      availableQuantity,
      unitPrice,
      requestedQuantity,
      dispensedQuantity: Number(source?.dispensedQuantity ?? 0),
      discountAmount,
      taxAmount,
      totalAmount: Number(source?.totalAmount ?? ((requestedQuantity * unitPrice) + taxAmount - discountAmount)),
      instructions: source?.instructions ?? source?.notes ?? '',
      allowAlternative: Boolean(source?.allowAlternative),
      isControlled: Boolean(source?.isControlled),
      status: (source?.status ?? 'pending') as 'pending' | 'dispensed' | 'shortage'
    };
  }

  private mapAttachment(source: any): PharmacyPrescriptionAttachment {
    return {
      id: Number(source?.id ?? source?.attachmentId ?? 0),
      fileName: source?.fileName ?? source?.name ?? 'attachment',
      fileSize: source?.fileSize ?? source?.size ?? '',
      uploadDate: new Date(source?.uploadDate ?? source?.createdAt ?? Date.now()),
      type: (source?.type ?? 'rx_image') as 'rx_image' | 'other'
    };
  }

  private normalizeNullableString(value: unknown): string {
    return `${value ?? ''}`.trim();
  }

  private extractItems(source: any): any[] {
    if (Array.isArray(source)) return source;
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source?.result?.items)) return source.result.items;
    return [];
  }

  private mapAllocateDispenseResult(raw: any): PharmacyAllocateDispenseResult {
    const allocationReferenceId =
      raw?.allocationReferenceId ??
      raw?.allocationReference?.id ??
      raw?.reservationId ??
      raw?.referenceId ??
      raw?.transactionId ??
      null;

    const commitMode = this.normalizeAllocateDispenseCommitMode(
      raw?.commitMode ?? raw?.allocationCommitMode ?? raw?.stockEffect ?? raw?.effect
    );

    const prescriptionStatus = (raw?.prescriptionStatus ??
      raw?.status ??
      raw?.prescription?.status ??
      undefined) as PharmacyPrescriptionStatus | undefined;

    return {
      allocationReferenceId,
      commitMode,
      prescriptionStatus
    };
  }

  private normalizeAllocateDispenseCommitMode(value: unknown): PharmacyAllocateDispenseCommitMode {
    const v = `${value ?? ''}`.trim().toLowerCase();
    if (!v) {
      return 'unknown';
    }
    if (['deduction', 'deduct', 'deducted', 'stock_deducted', 'committed'].includes(v)) {
      return 'deduction';
    }
    if (['reservation', 'reserved', 'hold', 'on_hold'].includes(v)) {
      return 'reservation';
    }
    if (['payload_logged', 'logged', 'audit', 'audit_only', 'logged_only'].includes(v)) {
      return 'payload_logged';
    }
    return 'unknown';
  }
}
