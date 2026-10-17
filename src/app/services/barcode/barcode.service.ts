import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface BarcodeProductListItem {
  id: string;
  arabicName: string;
  englishName: string;
  referenceCode: string;
}

export interface BarcodeProductsResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  data: BarcodeProductListItem[];
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private baseApi = environment.server_urls[environment.active_server].baseApi;
  private purchaseInvoiceUrl = environment.server_urls[environment.active_server].purchaseInvoiceUrl;
  private salesInvoiceUrl = environment.server_urls[environment.active_server].salesInvoiceUrl;
  private inventoryPermitUrl = `${this.baseApi}InventoryPermit`;
  private barcodeImageUrl = `${environment.server_urls[environment.active_server].invoiceUrl}QRs/barcode`;

  constructor(private http: HttpClient) {}

  getLocalizedBarcodeErrorMessage(
    error: unknown,
    currentLanguage: string | undefined,
    fallbackMessage: string
  ): string {
    const errorPayload = error as
      | { error?: { message?: string }; message?: string }
      | undefined;
    const apiErrorMessage = errorPayload?.error?.message || errorPayload?.message;

    if (currentLanguage === 'ar' && apiErrorMessage) {
      return apiErrorMessage;
    }

    return fallbackMessage;
  }

  getPurchaseProductByBarcode(barcode: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.purchaseInvoiceUrl}/product/barcode/${encodeURIComponent(barcode)}`);
  }

  getSaleProductByBarcode(barcode: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.salesInvoiceUrl}/product/barcode/${encodeURIComponent(barcode)}`);
  }

  getPermitProductByBarcode(barcode: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.inventoryPermitUrl}/product/barcode/${encodeURIComponent(barcode)}`);
  }

  getProductsForBarcode(pageNumber: number, pageSize: number, search?: string): Observable<BarcodeProductsResponse> {
    const normalizedSearch = (search || '').trim();
    const searchPart = normalizedSearch ? `&search=${encodeURIComponent(normalizedSearch)}` : '';
    const url = `${this.baseApi}inventory/products/for-barcode?pageNumber=${pageNumber}&pageSize=${pageSize}${searchPart}`;
    return this.http.get<BarcodeProductsResponse>(url);
  }

  buildBarcodeImageUrl(barcode: string): string {
    return `${this.barcodeImageUrl}/${encodeURIComponent(barcode)}`;
  }

  getBarcodeImage(barcode: string): Observable<Blob> {
    return this.http.get(`${this.barcodeImageUrl}/${encodeURIComponent(barcode)}`, {
      responseType: 'blob'
    });
  }
}
