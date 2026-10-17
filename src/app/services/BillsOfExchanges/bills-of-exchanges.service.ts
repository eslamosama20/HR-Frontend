import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BillOfExchangeResponseDto, BillOfExchangePostDto, BillOfExchangePutDto } from 'src/app/models/billOfExchange/billOfExchange';
import { environment } from 'src/environments/environment';

export interface UploadAssetResponse {
  assetUrl: string;
  publicId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillsOfExchangesService {
  private baseUrl = environment.server_urls[environment.active_server].billOfExchangeUrl;

  constructor(private http: HttpClient) {}

  // Get all bills of exchange
  getAllBills(): Observable<BillOfExchangeResponseDto[]> {
    return this.http.get<BillOfExchangeResponseDto[]>(this.baseUrl);
  }

  // Get a single bill of exchange by ID
  getBillById(id: string): Observable<BillOfExchangeResponseDto> {
    return this.http.get<BillOfExchangeResponseDto>(`${this.baseUrl}/${id}`);
  }

  // Add a new bill of exchange
  addBillOfExchange(bill: BillOfExchangePostDto): Observable<BillOfExchangeResponseDto> {
    return this.http.post<BillOfExchangeResponseDto>(this.baseUrl, bill);
  }

  // Update an existing bill of exchange
  updateBillOfExchange(id: string, bill: BillOfExchangePutDto): Observable<BillOfExchangeResponseDto> {
    return this.http.put<BillOfExchangeResponseDto>(`${this.baseUrl}/${id}`, bill);
  }

  // Delete a bill of exchange
  deleteBillOfExchange(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Get a new bill number
  getNewBillNumber(): Observable<{ BillNo: string }> {
    return this.http.get<{ BillNo: string }>(`${this.baseUrl}/billNo`);
  }

  uploadAsset(billOfExchangeId: string, file: File): Observable<UploadAssetResponse> {
    const formData = new FormData();
    formData.append('billOfExchangeId', billOfExchangeId);
    formData.append('file', file, file.name);
    return this.http.post<UploadAssetResponse>(`${environment.server_urls[environment.active_server].baseApi}billOfExchange/upload-asset`, formData);
  }
}
