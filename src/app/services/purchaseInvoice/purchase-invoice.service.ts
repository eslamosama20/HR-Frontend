import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { PurchaseInvoice } from 'src/app/models/purchaseInvoice/purchaseInvoice';
import { BaseResponse } from 'src/app/models/base-response';
import { PdfUtilsService } from '../pdf-utils.service';
import { environment } from 'src/environments/environment';

export interface PurchaseRequestForQuotationItem {
  id?: string;
  itemName: string;
  quantity: number;
  mainPurchaseClassId?: string | null;
  unitPrice?: number | null;
  isActive?: boolean;
}

export interface PurchaseRequestForQuotation {
  id?: string;
  items: PurchaseRequestForQuotationItem[];
  isActive?: boolean;
}

// New PurchaseQuotation models (frontal API)
export interface PurchaseQuotationItem {
  id?: number;
  itemNo?: string;
  mainPurchaseClassId?: string;
  price?: number;
  quantity?: number;
  tax?: number;
  taxAmount?: number;
  discount?: number;
  discountAmount?: number;
  totalPrice?: number;
  netPrice?: number;
}

export interface PurchaseQuotation {
  id?: number;
  invoiceNo?: string;
  supplierDetailsId?: string;
  currency?: string;
  description?: string;
  issueDate?: string;
  dueDate?: string;
  tax?: number;
  taxAmount?: number;
  discount?: number;
  discountAmount?: number;
  totalPrice?: number;
  netPrice?: number;
  purchaseQuotationItems?: PurchaseQuotationItem[];
  isFrontal?: boolean;
  isActive?: boolean;
  status?: string; // "Draft" | "ConvertedToInvoice"
  purchaseInvoiceId?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseInvoiceService {
  private baseUrl =
    environment.server_urls[environment.active_server].purchaseInvoiceUrl;
  private invoiceNoUrl = this.baseUrl + 'InvoiceNo';
  private purchaseRequestForQuotationUrl =
    environment.server_urls[environment.active_server].baseApi +
    'PurchaseRequestForQuotation';

  constructor(private http: HttpClient, private pdfUtilsService: PdfUtilsService) {}

  // ===================== Invoices =====================

  getAllInvoices(): Observable<PurchaseInvoice[]> {
    return this.http.get<PurchaseInvoice[]>(this.baseUrl);
  }

  // الباجينشن مع دعم أكثر من شكل لاستجابة الـ API
  getPagedInvoices(
    pageNumber: number = 1,
    pageSize: number = 10,
    sortField: string = 'invoiceNo',
    sortOrder: number = 1,
    filters: any = {},
    globalFilter: string = ''
  ): Observable<{ invoices: PurchaseInvoice[]; totalRecords: number }> {
    let url = `${this.baseUrl}?pageNumber=${pageNumber}&pageSize=${pageSize}&sortField=${sortField}&sortOrder=${sortOrder}`;

    // إضافة الفلاتر العامة أو الخاصة (مثل transactionId, invoiceNo)
    if (globalFilter) {
      url += `&globalFilter=${encodeURIComponent(globalFilter)}`;
    }
    if (filters?.transactionId) {
      url += `&transactionId=${encodeURIComponent(filters.transactionId.value)}`;
    }

    return this.http.get<any>(url).pipe(
      map((res) => {
        // الحالة 1: الـ API يرجّع مصفوفة مباشرة
        if (Array.isArray(res)) {
          return {
            invoices: res as PurchaseInvoice[],
            totalRecords: res.length,
          };
        }

        // الحالة 2: الـ API يرجّع كائن بعدة أشكال محتملة
        const invoices =
          res?.invoices ??
          res?.items ??
          res?.data ??
          res?.records ??
          res?.result?.items ??
          [];

        const totalRecords =
          res?.totalRecords ??
          res?.totalCount ??
          res?.total ??
          res?.count ??
          res?.result?.total ??
          (Array.isArray(invoices) ? invoices.length : 0);

        return {
          invoices: Array.isArray(invoices)
            ? (invoices as PurchaseInvoice[])
            : [],
          totalRecords: Number(totalRecords) || 0,
        };
      })
    );
  }

  getAllFrontalInvoices(): Observable<PurchaseInvoice[]> {
    return this.http.get<PurchaseInvoice[]>(this.baseUrl + '/frontal');
  }

  makeFrontal(id: string): Observable<PurchaseInvoice> {
    return this.http.post<PurchaseInvoice>(
      this.baseUrl + '/frontal/' + id,
      null
    );
  }

  getInvoiceById(id: number): Observable<PurchaseInvoice> {
    return this.http.get<PurchaseInvoice>(`${this.baseUrl}/${id}`);
  }

  createInvoice(invoice: PurchaseInvoice): Observable<any> {
    return this.http.post(`${this.baseUrl}`, invoice, this.getHttpOptions());
  }

  createInvoiceTransaction(id: number): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/createTransaction?invoiceId=${id}`,
      null,
      this.getHttpOptions()
    );
  }

  updateInvoice(id: number, invoice: PurchaseInvoice): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${id}`,
      invoice,
      this.getHttpOptions()
    );
  }

  deleteInvoice(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getInvoiceNumber(): Observable<any> {
    return this.http.get(`${this.baseUrl}/InvoiceNo`);
  }

  // ===================== Purchase Request For Quotation =====================

  createPurchaseRequestForQuotation(
    request: PurchaseRequestForQuotation
  ): Observable<PurchaseRequestForQuotation> {
    return this.http.post<PurchaseRequestForQuotation>(
      this.purchaseRequestForQuotationUrl,
      request,
      this.getHttpOptions()
    );
  }

  getAllPurchaseRequestsForQuotation(): Observable<
    PurchaseRequestForQuotation[]
  > {
    return this.http.get<PurchaseRequestForQuotation[]>(
      this.purchaseRequestForQuotationUrl
    );
  }

  /**
   * Get all frontal purchase quotations (with numeric IDs that can be converted)
   * GET /api/PurchaseQuotation/frontal
   */
  getFrontalQuotations(pageNumber?: number, pageSize?: number): Observable<any[]> {
    let url = environment.server_urls[environment.active_server].baseApi + 'PurchaseQuotation/frontal';
    
    const params = new URLSearchParams();
    if (pageNumber !== undefined) params.append('pageNumber', pageNumber.toString());
    if (pageSize !== undefined) params.append('pageSize', pageSize.toString());
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    return this.http.get<any[]>(url, this.getHttpOptions());
  }

  /**
   * Get a single purchase quotation by ID
   * GET /api/PurchaseQuotation/{id}
   */
  getQuotationById(id: number): Observable<any> {
    const url = environment.server_urls[environment.active_server].baseApi + 
                `PurchaseQuotation/${id}`;
    return this.http.get<any>(url, this.getHttpOptions());
  }

  /**
   * Create a frontal purchase quotation (can be converted to invoice)
   * POST /api/PurchaseQuotation
   */
  createFrontalQuotation(quotation: any): Observable<any> {
    const url = environment.server_urls[environment.active_server].baseApi + 'PurchaseQuotation';
    return this.http.post<any>(url, quotation, this.getHttpOptions());
  }

  /**
   * Update a frontal purchase quotation
   * PUT /api/PurchaseQuotation/{id}
   */
  updateFrontalQuotation(id: number, quotation: any): Observable<any> {
    const url = environment.server_urls[environment.active_server].baseApi + `PurchaseQuotation/${id}`;
    return this.http.put<any>(url, quotation, this.getHttpOptions());
  }

  /**
   * Delete a frontal purchase quotation
   * DELETE /api/PurchaseQuotation/{id}
   */
  deletePurchaseQuotation(id: number | string): Observable<any> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const url = environment.server_urls[environment.active_server].baseApi + `PurchaseQuotation/${numericId}`;
    return this.http.delete(url);
  }

  /**
   * Get frontal quotation invoice number
   * GET /api/PurchaseQuotation/InvoiceNo
   */
  getFrontalQuotationInvoiceNo(): Observable<any> {
    const url = environment.server_urls[environment.active_server].baseApi + 'PurchaseQuotation/InvoiceNo';
    return this.http.get<any>(url, this.getHttpOptions());
  }

  getPurchaseRequestForQuotationById(
    id: string
  ): Observable<PurchaseRequestForQuotation> {
    return this.http.get<PurchaseRequestForQuotation>(
      `${this.purchaseRequestForQuotationUrl}/${id}`
    );
  }

  updatePurchaseRequestForQuotation(
    requestForQuotationId: string,
    request: PurchaseRequestForQuotation
  ): Observable<PurchaseRequestForQuotation> {
    return this.http.put<PurchaseRequestForQuotation>(
      `${this.purchaseRequestForQuotationUrl}/${requestForQuotationId}`,
      request,
      this.getHttpOptions()
    );
  }

  deletePurchaseRequestForQuotation(id: string): Observable<any> {
    return this.http.delete(`${this.purchaseRequestForQuotationUrl}/${id}`);
  }

  // ===================== Share Request Quotation =====================

  shareRequestQuotationByEmail(requestId: string, email: string): Observable<any> {
    return this.http.post(
      `${this.purchaseRequestForQuotationUrl}/${requestId}/share/email`,
      { email },
      this.getHttpOptions()
    );
  }

  shareRequestQuotationsByEmail(requestIds: string[], email: string): Observable<any> {
    return this.http.post(
      `${this.purchaseRequestForQuotationUrl}/share/email/bulk`,
      { requestIds, email },
      this.getHttpOptions()
    );
  }

  shareRequestQuotationByWhatsapp(requestId: string, phoneNumber: string): Observable<any> {
    return this.http.post(
      `${this.purchaseRequestForQuotationUrl}/${requestId}/share/whatsapp`,
      { phoneNumber },
      this.getHttpOptions()
    );
  }

  shareRequestQuotationsByWhatsapp(requestIds: string[], phoneNumber: string): Observable<any> {
    return this.http.post(
      `${this.purchaseRequestForQuotationUrl}/share/whatsapp/bulk`,
      { requestIds, phoneNumber },
      this.getHttpOptions()
    );
  }

  // ===================== VAT Report Methods =====================

  GetPurchaseVATDetails(fromDate: string, toDate: string): Observable<BaseResponse<any[]>> {
    let searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post<BaseResponse<any[]>>(`${this.baseUrl}/Report/VAT/Details`, searchRequest);
  }

  ExportPurchaseVATToExcel(fromDate: string, toDate: string): Observable<Blob> {
    const searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post(`${this.baseUrl}/Report/VAT/Export`, searchRequest, {
      responseType: 'blob'
    });
  }

  downloadPurchaseVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/Report/VAT/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printPurchaseVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.baseUrl}/Report/VAT/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  sharePurchaseVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
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

  sharePurchaseVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
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

  // ===================== Invoice Report Methods =====================

  GetPurchaseInvoicesDetails(fromDate: string, toDate: string): Observable<BaseResponse<any[]>> {
    let searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post<BaseResponse<any[]>>(`${this.baseUrl}/Report/Details`, searchRequest);
  }

  downloadPurchaseInvoiceReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/Report/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printPurchaseInvoiceReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.baseUrl}/Report/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  downloadPurchaseInvoiceSummaryReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/Report/Summary/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printPurchaseInvoiceSummaryReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.baseUrl}/Report/Summary/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  sharePurchaseInvoiceSummaryReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/Report/Summary/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  sharePurchaseInvoiceSummaryReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/Report/Summary/share`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

  sharePurchaseInvoiceReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/Report/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  sharePurchaseInvoiceReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/Report/share`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

  // ===================== Net Purchase VAT Report =====================

  getNetPurchaseVATReport(startDate: string, endDate: string): Observable<any> {
    const url = `${this.baseUrl}/NetVATReport?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get(url);
  }

  downloadNetPurchaseVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/NetVATReport/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  shareNetPurchaseVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/NetVATReport/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  shareNetPurchaseVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/NetVATReport/share`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

  // ===================== Helpers =====================

  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };
  }

  /**
   * Convert a frontal purchase quotation to a purchase invoice
   * Sends the quotation data to the convert endpoint
   */
  convertPurchaseQuotationToInvoice(id: number | string, storeDetailsId: string, quotationData?: any): Observable<any> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const convertUrl = environment.server_urls[environment.active_server].baseApi + 
                      `PurchaseQuotation/${numericId}/convert?storeDetailsId=${storeDetailsId}`;
    return this.http.post(convertUrl, quotationData, this.getHttpOptions());
  }
}

