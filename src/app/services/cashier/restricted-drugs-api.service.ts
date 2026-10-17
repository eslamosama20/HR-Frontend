import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type RestrictedDrugDispenseStatus = 'pending' | 'approved' | 'rejected' | 'dispensed' | 'cancelled';

export interface RestrictedDrugStockItemDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  availableQty: number;
  batchNo: string | null;
  expiryDate: string | null;
  restrictionType: string | null;
}

export interface DispenseRestrictedDrugRequestDto {
  storeDetailsId: string;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  batchNo: string | null;
  expiryDate: string | null;
  quantity: number;
  patientName: string;
  doctorName: string;
  pharmacistName: string;
  authorizationNo: string;
  dispenseReason: string;
  status: RestrictedDrugDispenseStatus;
}

export interface RestrictedDrugDispenseDto {
  id: string;
  storeDetailsId?: string | null;
  storeName?: string | null;
  itemId?: string | null;
  itemCode: string;
  itemName: string;
  batchNo?: string | null;
  expiryDate?: string | null;
  quantity: number;
  patientName?: string | null;
  doctorName?: string | null;
  pharmacistName?: string | null;
  authorizationNo?: string | null;
  dispenseReason?: string | null;
  restrictionType?: string | null;
  status: RestrictedDrugDispenseStatus;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  dispensedBy?: string | null;
  dispensedAt?: string | null;
  createdAt?: string | null;
  prescriptionItems?: {
    itemCode: string;
    itemName: string;
    requestedQty: number;
    dispensedQty: number;
    unitPrice: number;
    batchNo?: string | null;
    expiryDate?: string | null;
    isControlled: boolean;
  }[] | null;
}

export interface RestrictedDrugDispensePagedResponseDto {
  total: number;
  page: number;
  size: number;
  data: RestrictedDrugDispenseDto[];
}

export interface UpdateDispenseStatusRequestDto {
  status: RestrictedDrugDispenseStatus;
  rejectionReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RestrictedDrugsApiService {
  private readonly baseApi = environment.server_urls[environment.active_server].baseApi;
  private readonly restrictedApi = `${this.baseApi}v1/pharmacy/restricted-drugs`;

  constructor(private http: HttpClient) {}

  lookupStock(params: { storeDetailsId?: string; search?: string }): Observable<RestrictedDrugStockItemDto[]> {
    let httpParams = new HttpParams();
    if (params.storeDetailsId) {
      httpParams = httpParams.set('storeDetailsId', params.storeDetailsId);
    }
    if (params.search !== undefined) {
      httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<RestrictedDrugStockItemDto[]>(`${this.restrictedApi}/lookup-stock`, { params: httpParams });
  }

  dispense(payload: DispenseRestrictedDrugRequestDto): Observable<any> {
    return this.http.post(`${this.restrictedApi}/dispense`, payload);
  }

  listDispenses(params: {
    storeDetailsId?: string;
    status?: RestrictedDrugDispenseStatus | '';
    search?: string;
    page?: number;
    size?: number;
  }): Observable<RestrictedDrugDispensePagedResponseDto> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('size', String(params.size ?? 20));

    if (params.storeDetailsId) {
      httpParams = httpParams.set('storeDetailsId', params.storeDetailsId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.search !== undefined) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<RestrictedDrugDispensePagedResponseDto>(`${this.restrictedApi}/dispenses`, { params: httpParams });
  }

  updateDispenseStatus(id: string, payload: UpdateDispenseStatusRequestDto): Observable<any> {
    return this.http.patch(`${this.restrictedApi}/dispenses/${encodeURIComponent(id)}/status`, payload);
  }
}

