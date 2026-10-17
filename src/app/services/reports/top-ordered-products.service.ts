import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TopProductModel, TopProductsFilter, TopProductsStatistics } from '../../models/reports/top-product.model';

@Injectable({
  providedIn: 'root'
})
export class TopOrderedProductsService {
  private baseApiUrl: string;

  constructor(private http: HttpClient) {
    this.baseApiUrl = environment.server_urls[environment.active_server].baseApi;
  }

  private buildParams(filters?: TopProductsFilter): HttpParams {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.fromDate) {
        const date = typeof filters.fromDate === 'string' ? filters.fromDate : filters.fromDate.toISOString();
        params = params.set('fromDate', date);
      }
      if (filters.toDate) {
        const date = typeof filters.toDate === 'string' ? filters.toDate : filters.toDate.toISOString();
        params = params.set('toDate', date);
      }
      if (filters.top) {
        params = params.set('top', filters.top.toString());
      }
      if (filters.searchTerm) {
        params = params.set('searchTerm', filters.searchTerm);
      }
      if (filters.storeId) {
        params = params.set('storeId', filters.storeId);
      }
    }
    
    return params;
  }

  /**
   * الحصول على قائمة المنتجات الأكثر طلباً
   */
  getTopOrderedProducts(filters?: TopProductsFilter): Observable<TopProductModel[]> {
    const params = this.buildParams(filters);
    return this.http.get<TopProductModel[]>(
      `${this.baseApiUrl}reports/TopOrderedProducts`,
      { params }
    );
  }

  /**
   * الحصول على الإحصائيات
   */
  getStatistics(filters?: TopProductsFilter): Observable<TopProductsStatistics> {
    const params = this.buildParams(filters);
    return this.http.get<TopProductsStatistics>(
      `${this.baseApiUrl}reports/TopOrderedProducts/statistics`,
      { params }
    );
  }

  /**
   * تصدير التقرير كـ PDF
   */
  exportToPdf(filters?: TopProductsFilter): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(
      `${this.baseApiUrl}reports/TopOrderedProducts/pdf`,
      { params, responseType: 'blob' }
    );
  }

  /**
   * تصدير التقرير كـ Excel
   */
  exportToExcel(filters?: TopProductsFilter): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(
      `${this.baseApiUrl}reports/TopOrderedProducts/excel`,
      { params, responseType: 'blob' }
    );
  }

  /**
   * مشاركة التقرير عبر البريد الإلكتروني
   */
  shareViaEmail(email: string, filters?: TopProductsFilter): Observable<any> {
    return this.http.post(
      `${this.baseApiUrl}reports/TopOrderedProducts/share/email`,
      {
        method: 'email',
        receiver: email,
        fromDate: filters?.fromDate,
        toDate: filters?.toDate
      }
    );
  }

  /**
   * مشاركة التقرير عبر واتساب
   */
  shareViaWhatsApp(phone: string, filters?: TopProductsFilter): Observable<any> {
    return this.http.post(
      `${this.baseApiUrl}reports/TopOrderedProducts/share/whatsapp`,
      {
        method: 'whatsapp',
        receiver: phone,
        fromDate: filters?.fromDate,
        toDate: filters?.toDate
      }
    );
  }
}
