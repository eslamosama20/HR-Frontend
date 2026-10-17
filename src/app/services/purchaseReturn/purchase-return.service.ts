import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PurchaseReturn } from 'src/app/models/purchaseReturn/purchaseReturn';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PurchaseReturnService {
  private baseUrl = environment.server_urls[environment.active_server].baseApi+'purchaseReturn';
  private purchaseReturnNoUrl = this.baseUrl + 'ReturnNo';




  constructor(private http: HttpClient) { }

  getAllReturns(): Observable<PurchaseReturn[]> {
    return this.http.get<PurchaseReturn[]>(this.baseUrl);
  }

  getReturnById(id: number): Observable<PurchaseReturn> {
    return this.http.get<PurchaseReturn>(`${this.baseUrl}/${id}`);
  }

  createReturn(purchaseReturn: PurchaseReturn): Observable<any> {
    return this.http.post(`${this.baseUrl}`, purchaseReturn, this.getHttpOptions());
  }

  createReturnTransaction(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/createTransaction?purchaseReturnId=${id}`,null ,this.getHttpOptions());
  }

  // Update an purchaseReturn by ID
  updateReturn(id: number, purchaseReturn: PurchaseReturn): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, purchaseReturn, this.getHttpOptions());
  }

  // Delete an purchaseReturn by ID
  deleteReturn(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // Get a new purchaseReturn number
  getReturnNumber(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ReturnNo`);
  }

  // Get Purchase Return VAT Details
  GetPurchaseReturnVATDetails(startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/VATReport?startDate=${startDate}&endDate=${endDate}`);
  }

  // Share Purchase Return VAT Report by Email
  sharePurchaseReturnVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/Report/VAT/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  // Share Purchase Return VAT Report by WhatsApp
  sharePurchaseReturnVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/Report/VAT/share`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

  // Download Purchase Return VAT Report Document
  downloadPurchaseReturnVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/Report/VAT/download?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  private getHttpOptions() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return httpOptions;
  }
}
