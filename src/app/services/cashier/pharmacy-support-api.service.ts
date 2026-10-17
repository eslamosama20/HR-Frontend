import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CreateInsuranceClaimRequest,
  InsuranceClaimListResult,
  InsuranceClaimViewModel,
  SubmitClaimRequest,
  SubmitClaimResult,
  UpdateInsuranceClaimStatusRequest,
  mapCreateInsuranceClaimRequest,
  mapInsuranceClaim,
  mapInsuranceClaimListResponse,
  mapSubmitClaimResponse,
  mapUpdateInsuranceClaimStatusRequest
} from 'src/app/adapters/pharmacy/insurance-claims.adapter';

export interface PharmacyPatientApiModel {
  id: string;
  patientCode: string;
  nationalId: string;
  fullName: string;
  dob: Date;
  age: number;
  gender: 'male' | 'female';
  isActive: boolean;
  phone: string;
  insuranceClass: string;
  activePrescriptions: number;
  allergies: string[];
  chronicDiseases: string[];
  notes?: string;
  lastVisit: Date;
}

export type PharmacyInsuranceClaimApiModel = InsuranceClaimViewModel;

export interface PharmacyAlertApiModel {
  id: string;
  code: string;
  type: string;
  level: string;
  state: string;
  title: string;
  message: string;
  branch: string;
  owner: string;
  referenceNo: string;
  sourcePage: string;
  actionTaken: string;
  closedAt: Date | null;
  closedBy: string;
  createdAt: Date;
}

export interface PharmacyReturnApiModel {
  id: string;
  returnNo: string;
  source: string;
  referenceType: string;
  referenceId: string | null;
  referenceNo: string;
  requestorName: string;
  createdBy: string;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  batchId: string | null;
  batchNo: string;
  storeId: string | null;
  storeName: string;
  targetStoreId: string | null;
  targetStoreName: string;
  unitId: string | null;
  quantity: number;
  availableReturnQty: number;
  approvedQty: number;
  receivedQty: number;
  unitPrice: number;
  reasonCode: string;
  reason: string;
  decisionReason: string;
  inventoryAction: string;
  status: string;
  refundAmount: number;
  refundMethod: string | null;
  supplierCreditAmount: number;
  notes: string;
  returnDate: Date;
  reviewedBy: string;
  approvedBy: string;
  reviewedAt: Date | null;
  approvedAt: Date | null;
}

export interface PharmacyControlledDrugApiModel {
  id: string;
  logNo: string;
  rxNo: string;
  patientName: string;
  drugName: string;
  schedule: 'II' | 'III' | 'IV' | 'V';
  quantity: number;
  prescriber: string;
  pharmacist: string;
  permitNo: string;
  status: string;
  reason: string;
  notes: string;
  dispenseDate: Date;
}

/**
 * Payload for restricted drug dispense (UI + future POST /v1/pharmacy/restricted-drugs/dispense).
 * Extra fields are forwarded on the legacy controlled-drugs POST for progressive Backend adoption.
 */
export interface RestrictedDrugDispensePayload {
  recordNo?: string;
  logNo?: string;
  prescriptionNo?: string;
  rxNo?: string;
  patientName: string;
  storeDetailsId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  batchNo?: string | null;
  expiryDate?: string | Date | null;
  unitName?: string;
  quantity: number;
  doctorName?: string;
  prescriber?: string;
  pharmacistName?: string;
  pharmacist?: string;
  authorizationNo?: string;
  permitNo?: string;
  status?: string;
  dispenseReason?: string;
  reason?: string;
  notes?: string;
  schedule?: 'II' | 'III' | 'IV' | 'V';
  /** Clinical restriction when known (controlled | narcotic | …). */
  restrictionType?: string | null;
}

export interface CheckoutRequest {
  pickupId: string;
  cashierSessionId: string;
  storeDetailsId: string;
  paymentMethod: string;
  cashAmount?: number;
  cardAmount?: number;
  notes?: string;
}

export interface CheckoutResponse {
  success: boolean;
  invoiceId?: string;
  invoiceNo?: string;
  changeAmount?: number;
  error?: string;
}

// --- Prescription CRUD DTOs (aligned with backend Guid contract) ---

export interface PrescriptionListItemApiDto {
  id: string;
  prescriptionNo: string;
  patientName: string;
  doctorName: string;
  status: string;
  insuranceStatus: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItemApiDto {
  lineId: string;
  itemId: string | null;
  name: string;
  quantity: number;
  dosage: string;
  notes: string;
  batchNo: string;
  expiryDate: string;
}

export interface CreatePrescriptionApiRequest {
  prescriptionNo: string;
  patientId: string;
  doctorId?: string | null;
  notes?: string;
  items?: CreatePrescriptionItemApiRequest[];
  insuranceApprovalStatus?: string;
}

export interface CreatePrescriptionItemApiRequest {
  itemId: string;
  name: string;
  quantity: number;
  dosage?: string;
  notes?: string;
  batchNo?: string;
  expiryDate?: string;
}

export interface UpdatePrescriptionApiRequest {
  prescriptionNo?: string;
  patientId?: string;
  doctorId?: string | null;
  notes?: string;
  lifecycleState?: string;
  insuranceApprovalStatus?: string;
}

export interface CreatePrescriptionApiResponse {
  id: string;
  prescriptionNo: string;
}

export interface UpdatePrescriptionApiResponse {
  id: string;
}

// --- Allocate-and-dispense enriched response ---

export interface AllocationLineApiDto {
  prescriptionItemId: string;
  itemId: string;
  storeId: string;
  batchNo: string;
  expiryDate: string;
  requestedQuantity: number;
  committedQuantity: number;
  availableQuantityAtCommit: number;
}

export interface AllocateAndDispenseApiResponse {
  success: boolean;
  lines: AllocationLineApiDto[];
}

export interface PosAvailableStoreDto {
  id: string;
  name: string;
  nameEn?: string;
  code?: string;
}

export interface ManualCreatePrescriptionItemRequest {
  itemId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number;
  dosage?: string | null;
  instructions?: string | null;
  /** Batch / stock traceability (forwarded when backend contract accepts them). */
  batchNo?: string | null;
  expiryDate?: string | null;
  unitPrice?: number | null;
  storeDetailsId?: string | null;
  storeId?: string | null;
}

export interface ManualCreatePrescriptionInsurancePayload {
  insuranceCompanyId?: number | string | null;
  insuranceName?: string | null;
  memberNo?: string | null;
  approvalNo?: string | null;
  coveragePercent?: number | null;
  requiresApproval?: boolean | null;
}

export interface ManualCreatePrescriptionRequest {
  patientId?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
  prescriptionNo?: string | null;
  notes?: string | null;
  storeDetailsId?: string | null;
  items: ManualCreatePrescriptionItemRequest[];
  insurance?: ManualCreatePrescriptionInsurancePayload | null;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacySupportApiService {
  private readonly baseApi = environment.server_urls[environment.active_server].baseApi;
  private readonly pharmacyApi = `${this.baseApi}v1/pharmacy`;
  private readonly inventoryApi = `${this.baseApi}v1/inventory`;

  constructor(private http: HttpClient) {}

  /** GET /v1/inventory/stores/pos-available — active pharmacy stores for POS / cashier. */
  getPosAvailableStores(): Observable<PosAvailableStoreDto[]> {
    return this.http.get<PosAvailableStoreDto[]>(`${this.inventoryApi}/stores/pos-available`);
  }

  // ══════════════════════════════════════════
  // Patients (IDs → Guid, pagination → pageSize)
  // ══════════════════════════════════════════

  getPatients(page = 1, pageSize = 50): Observable<PharmacyPatientApiModel[]> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/patients`, { params }).pipe(
      map((response) => this.extractItems(response).map((item: any) => this.mapPatient(item)))
    );
  }

  getPatientById(id: string): Observable<PharmacyPatientApiModel> {
    return this.http.get<any>(`${this.pharmacyApi}/patients/${id}`).pipe(map((response) => this.mapPatient(response)));
  }

  createPatient(payload: any): Observable<PharmacyPatientApiModel> {
    return this.http.post<any>(`${this.pharmacyApi}/patients`, payload).pipe(map((response) => this.mapPatient(response)));
  }

  updatePatient(id: string, payload: any): Observable<PharmacyPatientApiModel> {
    return this.http.put<any>(`${this.pharmacyApi}/patients/${id}`, payload).pipe(map((response) => this.mapPatient(response)));
  }

  deletePatient(id: string): Observable<any> {
    return this.http.delete<any>(`${this.pharmacyApi}/patients/${id}`);
  }

  getPatientPrescriptions(patientId: string): Observable<any[]> {
    return this.http.get<any>(`${this.pharmacyApi}/patients/${patientId}/prescriptions`).pipe(
      map(response => Array.isArray(response) ? response : (response?.data || response?.items || []))
    );
  }

  // ══════════════════════════════════════════
  // Prescription CRUD (NEW — wired to real backend)
  // ══════════════════════════════════════════

  getPrescriptions(page = 1, pageSize = 50): Observable<PrescriptionListItemApiDto[]> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/prescriptions`, { params }).pipe(
      map((response) => this.extractItems(response))
    );
  }

  getPrescriptionById(id: string): Observable<any> {
    return this.http.get<any>(`${this.pharmacyApi}/prescriptions/${id}`);
  }

  createPrescription(payload: CreatePrescriptionApiRequest): Observable<CreatePrescriptionApiResponse> {
    return this.http.post<CreatePrescriptionApiResponse>(`${this.pharmacyApi}/prescriptions`, payload);
  }

  /** POST /v1/pharmacy/prescriptions/manual — walk-in / free-text line items (status draft, rxNo server-generated). */
  createManualPrescription(payload: ManualCreatePrescriptionRequest): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/prescriptions/manual`, payload, { observe: 'body' });
  }

  updatePrescription(id: string, payload: any): Observable<UpdatePrescriptionApiResponse> {
    return this.http.put<UpdatePrescriptionApiResponse>(`${this.pharmacyApi}/prescriptions/${id}`, payload);
  }

  // --- Prescription Item CRUD (new endpoints from backend alignment) ---

  addPrescriptionItem(prescriptionId: string, item: CreatePrescriptionItemApiRequest): Observable<any> {
    return this.http.post<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/items`, item);
  }

  updatePrescriptionItem(prescriptionId: string, itemId: string, item: Partial<CreatePrescriptionItemApiRequest>): Observable<any> {
    return this.http.put<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/items/${itemId}`, item);
  }

  deletePrescriptionItem(prescriptionId: string, itemId: string): Observable<any> {
    return this.http.delete<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/items/${itemId}`);
  }

  // ══════════════════════════════════════════
  // Allocate & Dispense (enriched response)
  // ══════════════════════════════════════════

  allocateAndDispense(prescriptionId: string, payload: any): Observable<AllocateAndDispenseApiResponse> {
    return this.http.post<AllocateAndDispenseApiResponse>(
      `${this.pharmacyApi}/prescriptions/${prescriptionId}/allocate-and-dispense`,
      payload
    );
  }

  // ══════════════════════════════════════════
  // Doctors (pageSize aligned)
  // ══════════════════════════════════════════

  getDoctors(page = 1, pageSize = 50): Observable<any[]> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/doctors`, { params }).pipe(
      map((response) => this.extractItems(response))
    );
  }

  // ══════════════════════════════════════════
  // Insurance Companies (pageSize aligned)
  // ══════════════════════════════════════════

  getInsuranceCompanies(page = 1, pageSize = 50): Observable<any[]> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/insurance-companies`, { params }).pipe(
      map((response) => this.extractItems(response))
    );
  }

  // ══════════════════════════════════════════
  // Insurance Claims
  // ══════════════════════════════════════════

  getInsuranceClaims(page = 1, pageSize = 50, status?: string): Observable<PharmacyInsuranceClaimApiModel[]> {
    let params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());

    if (status && status !== 'all') {
      const apiStatus = mapLocalFilterToInsuranceQueryParam(status);
      if (apiStatus) {
        params = params.set('status', apiStatus);
      }
    }

    return this.http.get<any>(`${this.pharmacyApi}/insurance-claims`, { params }).pipe(
      map((response) => mapInsuranceClaimListResponse(response).items)
    );
  }

  getInsuranceClaimsPage(page = 1, pageSize = 50, status?: string): Observable<InsuranceClaimListResult> {
    let params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());

    if (status && status !== 'all') {
      const apiStatus = mapLocalFilterToInsuranceQueryParam(status);
      if (apiStatus) {
        params = params.set('status', apiStatus);
      }
    }

    return this.http.get<any>(`${this.pharmacyApi}/insurance-claims`, { params }).pipe(
      map((response) => mapInsuranceClaimListResponse(response))
    );
  }

  getInsuranceClaimById(id: string): Observable<PharmacyInsuranceClaimApiModel> {
    return this.http.get<any>(`${this.pharmacyApi}/insurance-claims/${id}`).pipe(map((response) => mapInsuranceClaim(response)));
  }

  createInsuranceClaim(payload: CreateInsuranceClaimRequest): Observable<PharmacyInsuranceClaimApiModel> {
    return this.http.post<any>(`${this.pharmacyApi}/insurance-claims`, mapCreateInsuranceClaimRequest(payload)).pipe(
      map((response) => mapInsuranceClaim(response))
    );
  }

  updateInsuranceClaimStatus(id: string, payload: UpdateInsuranceClaimStatusRequest): Observable<any> {
    return this.http.patch(`${this.pharmacyApi}/insurance-claims/${id}/status`, mapUpdateInsuranceClaimStatusRequest(payload));
  }

  submitPrescriptionClaim(prescriptionId: string, payload: SubmitClaimRequest = {}): Observable<SubmitClaimResult> {
    return this.http
      .post<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/submit-claim`, {
        saleInvoiceId: payload.saleInvoiceId ?? null,
        cashierPaymentId: payload.cashierPaymentId ?? null
      })
      .pipe(map((response) => mapSubmitClaimResponse(response)));
  }

  getClaimByPrescription(prescriptionId: string): Observable<PharmacyInsuranceClaimApiModel> {
    return this.http
      .get<any>(`${this.pharmacyApi}/prescriptions/${prescriptionId}/claim`)
      .pipe(map((response) => mapInsuranceClaim(response)));
  }

  pollNphiesClaim(claimId: string): Observable<PharmacyInsuranceClaimApiModel> {
    return this.http
      .post<any>(`${this.pharmacyApi}/insurance-claims/${claimId}/poll-nphies`, {})
      .pipe(map((response) => mapInsuranceClaim(response)));
  }

  // ══════════════════════════════════════════
  // Alerts
  // ══════════════════════════════════════════

  getAlerts(page = 1, pageSize = 50): Observable<PharmacyAlertApiModel[]> {
    const params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/alerts`, { params }).pipe(
      map((response) => this.extractItems(response).map((item: any) => this.mapAlert(item)))
    );
  }

  getAlertById(id: string): Observable<PharmacyAlertApiModel> {
    return this.http.get<any>(`${this.pharmacyApi}/alerts/${id}`).pipe(map((response) => this.mapAlert(response)));
  }

  createAlert(payload: any): Observable<PharmacyAlertApiModel> {
    return this.http.post<any>(`${this.pharmacyApi}/alerts`, payload).pipe(map((response) => this.mapAlert(response)));
  }

  assignAlert(id: string, owner: string): Observable<any> {
    return this.http.patch(`${this.pharmacyApi}/alerts/${id}/assign`, { owner });
  }

  closeAlert(id: string): Observable<any> {
    return this.http.post(`${this.pharmacyApi}/alerts/${id}/close`, {});
  }

  // ══════════════════════════════════════════
  // Returns
  // ══════════════════════════════════════════

  getReturns(page = 1, pageSize = 50): Observable<PharmacyReturnApiModel[]> {
    const params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/returns`, { params }).pipe(
      map((response) => this.extractItems(response).map((item: any) => this.mapReturn(item)))
    );
  }

  getReturnById(id: string): Observable<PharmacyReturnApiModel> {
    return this.http.get<any>(`${this.pharmacyApi}/returns/${id}`).pipe(map((response) => this.mapReturn(response)));
  }

  createReturn(payload: any): Observable<PharmacyReturnApiModel> {
    return this.http.post<any>(`${this.pharmacyApi}/returns`, payload).pipe(map((response) => this.mapReturn(response)));
  }

  /** GET /v1/pharmacy/returns/lookup-invoice/{invoiceNo} */
  lookupReturnInvoice(invoiceNo: string): Observable<any> {
    const raw = `${invoiceNo ?? ''}`.trim();
    return this.http.get<any>(`${this.pharmacyApi}/returns/lookup-invoice/${encodeURIComponent(raw)}`);
  }

  /**
   * Invoice-based return: { invoiceNo, items: [ { itemId, quantity } ] }
   * POST /v1/pharmacy/returns
   */
  createReturnFromInvoice(payload: { invoiceNo: string; items: Array<{ itemId: string; quantity: number }> }): Observable<PharmacyReturnApiModel> {
    return this.http.post<any>(`${this.pharmacyApi}/returns`, payload).pipe(map((response) => this.mapReturn(response)));
  }

  /**
   * PATCH return row (backend contract: resource path, not `/status` sub-route).
   * Aligns with Postman `PATCH /v1/pharmacy/returns/{id}`.
   */
  patchPharmacyReturn(
    id: string,
    payload: {
      status?: string;
      approvedQty?: number;
      receivedQty?: number;
      decisionReason?: string;
      notes?: string;
    }
  ): Observable<any> {
    return this.http.patch(`${this.pharmacyApi}/returns/${id}`, payload);
  }

  /** PATCH /v1/pharmacy/returns/{id}/status — body e.g. { "status": "approved" } */
  patchPharmacyReturnStatus(
    id: string,
    payload: { status: string; approvedAmount?: number; notes?: string }
  ): Observable<any> {
    return this.http.patch(`${this.pharmacyApi}/returns/${id}/status`, payload);
  }

  // ══════════════════════════════════════════
  // Controlled Drugs
  // ══════════════════════════════════════════

  getControlledDrugRecords(page = 1, pageSize = 50): Observable<PharmacyControlledDrugApiModel[]> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.pharmacyApi}/controlled-drugs`, { params }).pipe(
      map((response) => this.extractItems(response).map((item: any) => this.mapControlledDrug(item)))
    );
  }

  getControlledDrugRecordById(id: string): Observable<PharmacyControlledDrugApiModel> {
    return this.http.get<any>(`${this.pharmacyApi}/controlled-drugs/${id}`).pipe(map((response) => this.mapControlledDrug(response)));
  }

  createControlledDrugRecord(payload: any): Observable<PharmacyControlledDrugApiModel> {
    return this.http.post<any>(`${this.pharmacyApi}/controlled-drugs`, payload).pipe(map((response) => this.mapControlledDrug(response)));
  }

  /**
   * TODO(BACKEND): Preferred contract is `POST /v1/pharmacy/restricted-drugs/dispense` (see integration checklist).
   * Until then, maps to existing `POST /v1/pharmacy/controlled-drugs` and attaches stock fields for forward-compatible servers.
   */
  createRestrictedDrugDispense(payload: RestrictedDrugDispensePayload): Observable<PharmacyControlledDrugApiModel> {
    const expiry =
      payload.expiryDate === null || payload.expiryDate === undefined
        ? ''
        : typeof payload.expiryDate === 'string'
          ? payload.expiryDate
          : new Date(payload.expiryDate).toISOString();

    const legacy: Record<string, unknown> = {
      rxNo: payload.rxNo ?? payload.prescriptionNo ?? '',
      patientName: payload.patientName,
      drugName: payload.itemName,
      schedule: payload.schedule ?? 'II',
      quantity: payload.quantity,
      prescriber: payload.prescriber ?? payload.doctorName ?? '',
      pharmacist: payload.pharmacist ?? payload.pharmacistName ?? '',
      permitNo: payload.permitNo ?? payload.authorizationNo ?? '',
      status: payload.status ?? 'review',
      reason: payload.reason ?? payload.dispenseReason ?? '',
      notes: payload.notes ?? '',
      logNo: payload.logNo ?? payload.recordNo ?? '',
      storeDetailsId: payload.storeDetailsId,
      itemId: payload.itemId,
      itemCode: payload.itemCode,
      batchNo: payload.batchNo ?? '',
      expiryDate: expiry,
      unitName: payload.unitName ?? '',
      restrictionType: payload.restrictionType ?? null
    };

    return this.createControlledDrugRecord(legacy);
  }

  // ══════════════════════════════════════════
  // Checkout (UI Prepared, gated by feature flag)
  // ══════════════════════════════════════════

  checkoutPrescription(payload: CheckoutRequest): Observable<CheckoutResponse> {
    const cashierApi = `${this.baseApi}v1/cashier`;
    
    let paymentMethodInt = 0;
    const methodStr = `${payload.paymentMethod || ''}`.toUpperCase();
    if (methodStr === 'CARD') {
      paymentMethodInt = 1;
    } else if (methodStr === 'CREDIT') {
      paymentMethodInt = 2;
    }

    const mappedPayload = {
      pickupId: payload.pickupId,
      cashierSessionId: payload.cashierSessionId ? Number(payload.cashierSessionId) : null,
      storeDetailsId: payload.storeDetailsId,
      paymentMethod: paymentMethodInt,
      cashAmount: Number(payload.cashAmount ?? 0),
      cardAmount: Number(payload.cardAmount ?? 0),
      notes: payload.notes ?? ''
    };

    return this.http.post<CheckoutResponse>(`${cashierApi}/prescription-checkout`, mappedPayload);
  }

  // ══════════════════════════════════════════
  // Private helpers
  // ══════════════════════════════════════════

  private extractItems(source: any): any[] {
    if (Array.isArray(source)) return source;
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source?.result?.items)) return source.result.items;
    return [];
  }

  private mapPatient(source: any): PharmacyPatientApiModel {
    return {
      id: String(source?.id ?? ''),
      patientCode: source?.patientCode ?? source?.code ?? `PT-${source?.id ?? ''}`,
      nationalId: source?.nationalId ?? '',
      fullName: source?.fullName ?? source?.name ?? '',
      dob: new Date(source?.dob ?? source?.dateOfBirth ?? Date.now()),
      age: Number(source?.age ?? 0),
      gender: ((source?.gender ?? 'male').toString().toLowerCase().startsWith('f') ? 'female' : 'male'),
      isActive: source?.isActive ?? true,
      phone: source?.mobile ?? source?.phone ?? '',
      insuranceClass: source?.insuranceClass ?? '',
      activePrescriptions: Number(
        source?.activePrescriptions ?? 
        source?.ActivePrescriptions ?? 
        source?.totalPrescriptions ?? 
        source?.TotalPrescriptions ?? 
        source?.prescriptionsCount ?? 
        0
      ),
      allergies: Array.isArray(source?.allergies)
        ? source.allergies
        : typeof source?.allergies === 'string' && source.allergies.trim().length > 0
          ? source.allergies.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean)
          : [],
      chronicDiseases: Array.isArray(source?.chronicDiseases)
        ? source.chronicDiseases
        : typeof source?.chronicDiseases === 'string' && source.chronicDiseases.trim().length > 0
          ? source.chronicDiseases.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean)
          : [],
      notes: source?.notes ?? '',
      lastVisit: new Date(source?.lastVisit ?? Date.now())
    };
  }

  private mapAlert(source: any): PharmacyAlertApiModel {
    const typeRaw = (source?.alertType ?? source?.type ?? 'stock').toString();
    const levelRaw = (source?.alertLevel ?? source?.level ?? 'medium').toString();
    const type = this.normalizePharmacyAlertType(typeRaw);
    const level = this.normalizePharmacyAlertLevel(levelRaw);
    const state = this.normalizePharmacyAlertState(source?.state ?? source?.status);
    return {
      id: String(source?.id ?? ''),
      code: source?.code ?? `ALT-${source?.id ?? ''}`,
      type,
      level,
      state,
      title: source?.title ?? '',
      message: source?.message ?? '',
      branch: source?.branch ?? source?.storeName ?? '',
      owner: source?.owner ?? 'غير مسند',
      referenceNo: source?.referenceNo ?? '',
      sourcePage: source?.sourcePage ?? '',
      actionTaken: source?.actionTaken ?? '',
      closedAt: source?.closedAt ? new Date(source.closedAt) : null,
      closedBy: source?.closedBy ?? '',
      createdAt: new Date(source?.createdAt ?? Date.now())
    };
  }

  private normalizePharmacyAlertType(raw: string): PharmacyAlertApiModel['type'] {
    const t = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (t === 'expiry_alert' || t === 'expiryalert' || t === 'expiry') {
      return 'expiry';
    }
    if (t === 'low_stock' || t === 'lowstock' || t === 'stock') {
      return 'stock';
    }
    if (t === 'drug_interaction' || t === 'druginteraction' || t === 'interaction') {
      return 'interaction';
    }
    if (t === 'temperature') {
      return 'temperature';
    }
    if (t === 'insurance') {
      return 'insurance';
    }
    return 'stock';
  }

  private normalizePharmacyAlertLevel(raw: string): PharmacyAlertApiModel['level'] {
    const l = raw.trim().toLowerCase();
    if (l === 'critical' || l === 'high' || l === 'medium' || l === 'low') {
      return l;
    }
    return 'medium';
  }

  private normalizePharmacyAlertState(raw: unknown): PharmacyAlertApiModel['state'] {
    const s = `${raw ?? 'open'}`.trim().toLowerCase().replace(/\s+/g, '_');
    if (s === 'open' || s === 'new') {
      return 'new';
    }
    if (s === 'assigned' || s === 'inprogress' || s === 'in_progress') {
      return 'in_progress';
    }
    if (s === 'closed' || s === 'close') {
      return 'closed';
    }
    return 'new';
  }

  private mapReturn(source: any): PharmacyReturnApiModel {
    const status = (source?.status ?? 'pending').toString().toLowerCase();
    return {
      id: String(source?.id ?? ''),
      returnNo: source?.returnNo ?? source?.code ?? `PR-${source?.id ?? ''}`,
      source: (source?.source ?? 'customer').toString().toLowerCase(),
      referenceType: (source?.referenceType ?? 'prescription').toString().toLowerCase(),
      referenceId: source?.referenceId ? String(source.referenceId) : null,
      referenceNo: source?.referenceNo ?? '',
      requestorName: source?.requestorName ?? '',
      createdBy: source?.createdBy ?? '',
      itemId: source?.itemId ? String(source.itemId) : null,
      itemCode: source?.itemCode ?? '',
      itemName: source?.itemName ?? '',
      batchId: source?.batchId ? String(source.batchId) : null,
      batchNo: source?.batchNo ?? '',
      storeId: source?.storeId ? String(source.storeId) : null,
      storeName: source?.storeName ?? '',
      targetStoreId: source?.targetStoreId ? String(source.targetStoreId) : null,
      targetStoreName: source?.targetStoreName ?? '',
      unitId: source?.unitId ? String(source.unitId) : null,
      quantity: Number(source?.quantity ?? 0),
      availableReturnQty: Number(source?.availableReturnQty ?? source?.quantity ?? 0),
      approvedQty: Number(source?.approvedQty ?? source?.quantity ?? 0),
      receivedQty: Number(source?.receivedQty ?? source?.approvedQty ?? source?.quantity ?? 0),
      unitPrice: Number(source?.unitPrice ?? 0),
      reasonCode: (source?.reasonCode ?? 'other').toString().toLowerCase(),
      reason: source?.reason ?? '',
      decisionReason: source?.decisionReason ?? '',
      inventoryAction: (source?.inventoryAction ?? 'restock').toString().toLowerCase(),
      status: status === 'inprogress' ? 'review' : status,
      refundAmount: Number(source?.refundAmount ?? 0),
      refundMethod: source?.refundMethod ?? null,
      supplierCreditAmount: Number(source?.supplierCreditAmount ?? 0),
      notes: source?.notes ?? '',
      returnDate: new Date(source?.returnDate ?? source?.createdAt ?? Date.now()),
      reviewedBy: source?.reviewedBy ?? '',
      approvedBy: source?.approvedBy ?? '',
      reviewedAt: source?.reviewedAt ? new Date(source.reviewedAt) : null,
      approvedAt: source?.approvedAt ? new Date(source.approvedAt) : null
    };
  }

  private mapControlledDrug(source: any): PharmacyControlledDrugApiModel {
    return {
      id: String(source?.id ?? ''),
      logNo: source?.logNo ?? source?.code ?? `CDR-${source?.id ?? ''}`,
      rxNo: source?.rxNo ?? '',
      patientName: source?.patientName ?? '',
      drugName: source?.drugName ?? '',
      schedule: ((source?.schedule ?? 'II').toString().toUpperCase()) as 'II' | 'III' | 'IV' | 'V',
      quantity: Number(source?.quantity ?? 0),
      prescriber: source?.prescriber ?? '',
      pharmacist: source?.pharmacist ?? '',
      permitNo: source?.permitNo ?? '',
      status: (source?.status ?? 'review').toString().toLowerCase(),
      reason: source?.reason ?? '',
      notes: source?.notes ?? '',
      dispenseDate: new Date(source?.dispenseDate ?? source?.createdAt ?? Date.now())
    };
  }
}

/**
 * Query `status` for GET /insurance-claims (lowercase: pending | approved | rejected | submitted).
 * Returns null when the UI filter is not mappable to a backend value (e.g. NPHIES filters — list unfiltered from API).
 */
function mapLocalFilterToInsuranceQueryParam(status: string): string | null {
  if (!status || status === 'all') {
    return null;
  }
  const s = status.trim();
  const lower = s.toLowerCase();
  if (['pending', 'approved', 'rejected', 'submitted'].includes(lower)) {
    return lower;
  }
  const pascal: Record<string, string> = {
    Pending: 'pending',
    Submitted: 'submitted',
    Approved: 'approved',
    Rejected: 'rejected',
    Paid: 'approved',
    PartiallyApproved: 'submitted'
  };
  return pascal[s] ?? null;
}
