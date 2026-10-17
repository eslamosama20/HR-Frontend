import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of, catchError } from 'rxjs';
import { BaseResponse } from 'src/app/models/base-response';
import { SalesInvoiceDetails } from 'src/app/models/salesInvoice/sales-invoice-details';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { PdfUtilsService } from '../pdf-utils.service';
import { PrintSettingsService } from '../print-settings.service';
import { HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface SalesInvoiceImportFailure {
  row: number;
  invoiceNo: string;
  customerName: string;
  reason: string;
  errorCode?: string;
}

export interface SalesInvoiceImportResult {
  imported: number;
  updated: number;
  failed: SalesInvoiceImportFailure[];
}

export interface SalesInvoiceByReservationIdsRequest {
  reservationIds: string[];
}

export interface SalesInvoiceByReservationIdsResponse {
  invoices: Record<string, SalesInvoice>;
}

@Injectable({
  providedIn: 'root'
})
export class SalesInvoiceService {
  private salesInvoiceUrl = environment.server_urls[environment.active_server].salesInvoiceUrl;

  constructor(
    private http: HttpClient,
    private pdfUtilsService: PdfUtilsService,
    private printSettingsService: PrintSettingsService
  ) { }

  // GET: Retrieve all sale invoices
  getAllInvoices(): Observable<SalesInvoice[]> {
    return this.http.get<SalesInvoice[]>(`${this.salesInvoiceUrl}`);
  }

  // GET: Retrieve unpaid invoices by mainAccountId
  getUnpaidInvoices(mainAccountId: string): Observable<SalesInvoice[]> {
    return this.http.get<SalesInvoice[]>(`${this.salesInvoiceUrl}/unpaid/${mainAccountId}`);
  }

  /** ✅ جلب فواتير مع Pagination من السيرفر */
  /** ✅ جلب فواتير مع Pagination حسب الـ API الفعلي عندك */
  getInvoicesPaged(
    pageNumber: number,
    pageSize: number,
    options?: { isFrontal?: boolean; isSentToZatca?: boolean | null; keyword?: string; hasTransaction?: boolean | null }
  ): Observable<{ items: SalesInvoice[]; total: number }> {

    const baseUrl = options?.isFrontal
      ? `${this.salesInvoiceUrl}/frontal`
      : this.salesInvoiceUrl;

    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    // Add ZATCA filter if specified
    if (options?.isSentToZatca !== undefined && options?.isSentToZatca !== null) {
      params = params.set('isSentToZatca', String(options.isSentToZatca));
    }

    // Add keyword search filter if specified
    if (options?.keyword) {
      params = params.set('keyword', options.keyword);
    }

    // Add transaction filter if specified (server-side, fixes pagination)
    if (options?.hasTransaction !== undefined && options?.hasTransaction !== null) {
      params = params.set('hasTransaction', String(options.hasTransaction));
    }

    return this.http.get<any>(baseUrl, { params }).pipe(
      map((resp) => {
        // Handle OperationResponse<PaginatedResult<T>> shape: { errorCode, data: { totalCount, data: [...] } }
        if (resp && !Array.isArray(resp) && resp.data && !Array.isArray(resp.data) && Array.isArray(resp.data.data)) {
          return { items: resp.data.data, total: Number(resp.data.totalCount) || 0 };
        }
        // Handle common paginated response shapes
        if (resp && !Array.isArray(resp)) {
          const items = resp.items ?? resp.data ?? resp.result?.items ?? resp.records ?? resp.list ?? [];
          const total = resp.total ?? resp.totalCount ?? resp.totalRecords ?? resp.result?.total ?? resp.count ?? (Array.isArray(items) ? items.length : 0);
          return { items: Array.isArray(items) ? items : [], total: Number(total) || 0 };
        }
        // If API returns a full array (no server pagination), slice locally
        const full = Array.isArray(resp) ? resp : [];
        const start = Math.max(0, (pageNumber - 1) * pageSize);
        const end = start + pageSize;
        const items = full.slice(start, end);
        const total = full.length;
        return { items, total };
      })
    );
  }

  getReservationInvoicesPaged(
    pageNumber: number,
    pageSize: number,
    type?: number,
    keyword?: string,
    sortField?: string,
    sortOrder?: number,
    isSentToZatca?: boolean | null,
    hasTransaction?: boolean | null
  ): Observable<{ items: any[]; total: number }> {

    const baseUrl = `${this.salesInvoiceUrl}/with-reservations`;

    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (type !== undefined && type !== null) {
      params = params.set('type', String(type));
    }
    if (keyword) {
      params = params.set('keyword', keyword);
    }
    if (sortField) {
      params = params.set('sortField', sortField);
    }
    if (sortOrder !== undefined && sortOrder !== null) {
      params = params.set('sortOrder', String(sortOrder));
    }
    if (isSentToZatca !== undefined && isSentToZatca !== null) {
      params = params.set('isSentToZatca', String(isSentToZatca));
    }
    if (hasTransaction !== undefined && hasTransaction !== null) {
      params = params.set('hasTransaction', String(hasTransaction));
    }

    return this.http.get<any>(baseUrl, { params }).pipe(
      map((resp) => {
        if (resp && resp.data && resp.data.data) {
          // OperationResponse<PaginatedResult<T>>
          const paginated = resp.data;
          return { items: paginated.data ?? [], total: paginated.totalCount ?? 0 };
        }
        if (resp && !Array.isArray(resp) && 'data' in resp && 'totalCount' in resp) {
          return { items: resp.data ?? [], total: resp.totalCount ?? 0 };
        }
        const items = Array.isArray(resp) ? resp : [];
        const total = ((pageNumber - 1) * pageSize) + items.length;
        return { items, total };
      })
    );
  }


  shareInvoiceByEmail(invoiceId: number, email: string): Observable<any> {
    const base = environment.server_urls[environment.active_server];
    const url = `${base.salesInvoiceUrl}/${invoiceId}/share`;
    const body = { method: 'email', receiver: email };
    return this.http.post(url, body);
  }

  /** مشاركة مجموعة فواتير عبر الإيميل */
  shareInvoicesByEmail(ids: number[], email: string): Observable<any> {
    const uniqueIds = Array.from(new Set((ids || []).filter((x) => x != null)));
    const base = environment.server_urls[environment.active_server];
    const url = `${base.salesInvoiceUrl}/invoices/share`;
    const body = { ids: uniqueIds, method: 'email', receiver: email };
    return this.http.post(url, body);
  }
  /** مشاركة فاتورة واحدة عبر واتساب */
  shareInvoiceByWhatsapp(invoiceId: number, phone: string): Observable<any> {
    const base = environment.server_urls[environment.active_server];
    const url = `${base.salesInvoiceUrl}/${invoiceId}/whatsappShare`;
    const body = { method: 'Whatsapp', receiver: phone };
    return this.http.post(url, body);
  }

  /** مشاركة مجموعة فواتير عبر واتساب */
  shareInvoicesByWhatsapp(ids: number[], phone: string): Observable<any> {
    const uniqueIds = Array.from(new Set((ids || []).filter((x) => x != null)));
    const base = environment.server_urls[environment.active_server];
    const url = `${base.salesInvoiceUrl}/invoices/whatsappShare`;
    const body = { ids: uniqueIds, method: 'Whatsapp', receiver: phone };
    return this.http.post(url, body);
  }

  getAllFrontalInvoices(): Observable<SalesInvoice[]> {
    return this.http.get<SalesInvoice[]>(`${this.salesInvoiceUrl}/frontal`);
  }

  makeFrontal(id: number): Observable<SalesInvoice> {
    return this.http.post<SalesInvoice>(`${this.salesInvoiceUrl}/frontal/${id}`, null, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }


  getAllQuotationInvoices(): Observable<SalesInvoice[]> {
    return this.http.get<SalesInvoice[]>(`${this.salesInvoiceUrl}/quotation`);
  }

  // GET: Retrieve a specific sale invoice by ID
  getInvoiceById(id: number): Observable<SalesInvoice> {
    return this.http.get<SalesInvoice>(`${this.salesInvoiceUrl}/${id}`);
  }

  // GET: Retrieve prepared copy template of an invoice
  getCopyTemplate(id: number): Observable<SalesInvoice> {
    return this.http.get<SalesInvoice>(`${this.salesInvoiceUrl}/copy-template/${id}`);
  }

  // GET: Lightweight payment summary (invoiceNo, total, paidAmount, remainingAmount, paymentStatus)
  getInvoiceSummary(id: number): Observable<any> {
    return this.http.get<any>(`${this.salesInvoiceUrl}/${id}/payment-summary`);
  }

  // GET: Retrieve invoice by reservation ID
  getInvoiceByReservationId(reservationId: string): Observable<SalesInvoice | null> {
    return this.http.get<SalesInvoice | null>(`${this.salesInvoiceUrl}/by-reservation/${reservationId}`).pipe(
      catchError(() => of(null))
    );
  }

  getInvoicesByReservationIdsBatch(reservationIds: string[]): Observable<SalesInvoiceByReservationIdsResponse> {
    const uniqueIds = Array.from(new Set((reservationIds || []).map(String).filter(Boolean)));
    const body: SalesInvoiceByReservationIdsRequest = { reservationIds: uniqueIds };
    return this.http.post<SalesInvoiceByReservationIdsResponse>(`${this.salesInvoiceUrl}/by-reservation-ids`, body);
  }

  /** 🔹 جلب الفواتير الخاصة بعدة حجوزات (ReservationIds[]) */
  getInvoicesByReservations(reservationIds: string[]): Observable<SalesInvoice[]> {
    const uniqueIds = Array.from(new Set((reservationIds || []).map(String).filter(Boolean)));
    if (!uniqueIds.length) {
      return new Observable<SalesInvoice[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    // ✅ استخدم نفس base المستخدم في باقي الدوال: this.salesInvoiceUrl
    // ولا تبني الـ query يدويًا
    let params = new HttpParams();
    uniqueIds.forEach(id => params = params.append('reservationIds', id));

    const url = `${this.salesInvoiceUrl}/by-reservations`; // ← يساوي: http://localhost:5001/api/SaleInvoice/by-reservations

    return this.http.get<SalesInvoice[]>(url, { params });
  }

  // DELETE: Delete a sale invoice by ID
  deleteInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.salesInvoiceUrl}/${id}`);
  }

  private toDecimal(value: unknown, fallback = 0): number {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toGuidOrNull(value: unknown): string | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidRegex.test(trimmed) ? trimmed : null;
  }

  private normalizeInvoiceDto(invoiceDto: Partial<SalesInvoice>): SalesInvoice {
    const dto: any = { ...(invoiceDto as any) };

    dto.customerProfileId = this.toGuidOrNull(dto.customerProfileId);
    dto.storeDetailsId = this.toGuidOrNull(dto.storeDetailsId);
    dto.projectId = this.toGuidOrNull(dto.projectId);
    dto.customerDepartmentId = this.toGuidOrNull(dto.customerDepartmentId);
    dto.referenceNumber = (dto.referenceNumber && typeof dto.referenceNumber === 'string' && dto.referenceNumber.trim() !== '')
      ? dto.referenceNumber.trim()
      : null;

    if (Array.isArray(dto.reservationIds)) {
      dto.reservationIds = dto.reservationIds
        .map((r: any) => this.toGuidOrNull(r))
        .filter((r: any): r is string => r !== null);
      if (dto.reservationIds.length === 0) {
        dto.reservationIds = null;
      }
    } else {
      dto.reservationIds = null;
    }

    dto.tax = this.toDecimal(dto.tax, 0);
    dto.taxAmount = this.toDecimal(dto.taxAmount, 0);
    dto.discount = this.toDecimal(dto.discount, 0);
    dto.discountAmount = this.toDecimal(dto.discountAmount, 0);
    dto.totalPrice = this.toDecimal(dto.totalPrice, 0);
    dto.netPrice = this.toDecimal(dto.netPrice, 0);

    dto.saleItems = Array.isArray(dto.saleItems)
      ? dto.saleItems.map((it: any) => ({
        ...it,
        id: it.id ? Number(it.id) : null,
        saleInvoiceId: it.saleInvoiceId ? Number(it.saleInvoiceId) : null,
        mainSalesClassId: this.toGuidOrNull(it.mainSalesClassId) || it.mainSalesClassId,
        price: this.toDecimal(it.price, 0),
        quantity: this.toDecimal(it.quantity, 0),
        noOfNights: Math.max(1, Math.round(this.toDecimal(it.noOfNights, 1))),
        tax: this.toDecimal(it.tax, 0),
        taxAmount: this.toDecimal(it.taxAmount, 0),
        discount: this.toDecimal(it.discount, 0),
        discountAmount: this.toDecimal(it.discountAmount, 0),
        totalPrice: this.toDecimal(it.totalPrice, 0),
        netPrice: this.toDecimal(it.netPrice, 0),
      }))
      : [];

    return dto as SalesInvoice;
  }

  // POST: Create a new sale invoice
  createInvoice(invoiceDto: SalesInvoice): Observable<SalesInvoice> {
    const normalized = this.normalizeInvoiceDto(invoiceDto);
    // Swagger schema expects invoice fields at root (no wrapper)
    return this.http.post<SalesInvoice>(this.salesInvoiceUrl, normalized, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  // POST: Create a new quotation
  createQuotation(invoiceDto: SalesInvoice): Observable<SalesInvoice> {
    const normalized = this.normalizeInvoiceDto(invoiceDto);
    return this.http.post<SalesInvoice>(`${this.salesInvoiceUrl}/quotation`, normalized, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  // POST: Convert quotation to invoice
  convertQuotationToInvoice(quotationId: number): Observable<SalesInvoice> {
    return this.http.post<SalesInvoice>(`${this.salesInvoiceUrl}/convert-quotation/${quotationId}`, null, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  createAndClearInvoice(invoiceDto: SalesInvoice): Observable<SalesInvoice> {
    const normalized = this.normalizeInvoiceDto(invoiceDto);
    return this.http.post<SalesInvoice>(this.salesInvoiceUrl + '/frontal', normalized, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }



  createInvoiceTransaction(id: number): Observable<any> {
    return this.http.post(`${this.salesInvoiceUrl}/createTransaction?invoiceId=${id}`, null, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    })
  }


  bulkCreateTransactionsOptimized(ids: number[]): Observable<any> {
    return this.http.post(`${this.salesInvoiceUrl}/bulkCreateTransactionsOptimized`, ids, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  getCustomerCreditBalance(mainAccountId: string): Observable<number> {
    return this.http.get<number>(`${this.salesInvoiceUrl}/credit-balance/${mainAccountId}`);
  }

  applyCreditBalance(dto: { mainAccountId: string, allocations: { invoiceId: number, amount: number }[] }): Observable<any> {
    return this.http.post(`${this.salesInvoiceUrl}/apply-credit`, dto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  // PUT: Update an existing sale invoice
  updateInvoice(id: number, invoiceDto: SalesInvoice): Observable<void> {
    return this.http.put<void>(`${this.salesInvoiceUrl}/${id}`, invoiceDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  // GET: Generate a new invoice number
  getInvoiceNo(): Observable<{ invoiceNo: string }> {
    return this.http.get<{ invoiceNo: string }>(`${this.salesInvoiceUrl}/InvoiceNo`);
  }

  getQuotationNo(): Observable<{ quotationNo: string }> {
    return this.http.get<{ quotationNo: string }>(`${this.salesInvoiceUrl}/quotationNo`);
  }

  GetSalesInvoicesDetails(fromDate: string, toDate: string): Observable<BaseResponse<SalesInvoiceDetails[]>> {
    let searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post<BaseResponse<SalesInvoiceDetails[]>>(`${this.salesInvoiceUrl}/Report/Details`, searchRequest);
  }

  ExportSalesInvoiceToExcel(fromDate: string, toDate: string): Observable<Blob> {
    const searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post(`${this.salesInvoiceUrl}/Report/Details/Export`, searchRequest, {
      responseType: 'blob' // Important: set the response type to 'blob'
    });
  }

  downloadSalesInvoiceReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.salesInvoiceUrl}/Report/Details/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printSalesInvoiceReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.salesInvoiceUrl}/Report/Details/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  downloadSalesInvoiceSummaryReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.salesInvoiceUrl}/Report/Details/summary-document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printSalesInvoiceSummaryReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.salesInvoiceUrl}/Report/Details/summary-document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  shareSalesInvoiceReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.salesInvoiceUrl}/Report/Details/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  shareSalesInvoiceReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.salesInvoiceUrl}/Report/Details/whatsappShare`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

  // VAT Report Methods
  GetSalesVATDetails(fromDate: string, toDate: string): Observable<BaseResponse<any[]>> {
    let searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post<BaseResponse<any[]>>(`${this.salesInvoiceUrl}/Report/VAT/Details`, searchRequest);
  }

  ExportSalesVATToExcel(fromDate: string, toDate: string): Observable<Blob> {
    const searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post(`${this.salesInvoiceUrl}/Report/VAT/Export`, searchRequest, {
      responseType: 'blob'
    });
  }

  downloadSalesVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.salesInvoiceUrl}/Report/VAT/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printSalesVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.salesInvoiceUrl}/Report/VAT/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  shareSalesVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.salesInvoiceUrl}/Report/VAT/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  shareSalesVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.salesInvoiceUrl}/Report/VAT/share`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

  validateZatcaInvoice(id: number): Observable<any> {
    return this.http.get<any>(`${this.salesInvoiceUrl}/validateZatca/${id}`);
  }

  clearSalesInvoice(id: number): Observable<any> {
    return this.http.post<any>(this.salesInvoiceUrl + '/clearInvoice', {
      id: id,
    }, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  /** Map printType string to backend enum value: A4Portrait=0, A4Landscape=1, Thermal80mm=2, Thermal58mm=3, Format1Server=4 */
  private printTypeToEnum(printType: string): number {
    const printTypeMap: { [key: string]: number } = {
      'A4Portrait': 0,
      'A4Landscape': 1,
      'Thermal80mm': 2,
      'Thermal58mm': 3,
      'Format1Server': 4
    };
    return printTypeMap[printType] ?? 0;
  }

  /**
   * Builds the parity query-string for the server-side Print-1 replica
   * (InvoicePrintType.Format1Server = 4). Mirrors the frontend print-settings
   * (PrintSettingsService localStorage) + active language so the server PDF
   * matches the frontend Print 1 template exactly.
   */
  buildPrint1Params(opts: {
    lang: string;
    showStamp: boolean;
    showCompanySignature: boolean;
    showCustomerSignature: boolean;
    uncheckedPolicies: string[];
    uncheckedBanks: string[];
  }): string {
    const p = new URLSearchParams();
    p.set('lang', opts.lang);
    p.set('showStamp', String(opts.showStamp));
    p.set('showCompanySignature', String(opts.showCompanySignature));
    p.set('showCustomerSignature', String(opts.showCustomerSignature));
    if (opts.uncheckedPolicies && opts.uncheckedPolicies.length) {
      p.set('uncheckedPolicies', opts.uncheckedPolicies.join(','));
    }
    if (opts.uncheckedBanks && opts.uncheckedBanks.length) {
      p.set('uncheckedBanks', opts.uncheckedBanks.join(','));
    }
    return p.toString();
  }

  buildPrint2Params(opts: {
    lang?: string;
    showTermsInPrint2: boolean;
    showBanksInPrint2: boolean;
    uncheckedPolicies?: string[];
    uncheckedBanks?: string[];
  }): string {
    const p = new URLSearchParams();
    if (opts.lang) p.set('lang', opts.lang);
    p.set('showTermsInPrint2', String(opts.showTermsInPrint2));
    p.set('showBanksInPrint2', String(opts.showBanksInPrint2));
    if (opts.uncheckedPolicies && opts.uncheckedPolicies.length) {
      p.set('uncheckedPolicies', opts.uncheckedPolicies.join(','));
    }
    if (opts.uncheckedBanks && opts.uncheckedBanks.length) {
      p.set('uncheckedBanks', opts.uncheckedBanks.join(','));
    }
    return p.toString();
  }

  /** Appends the optional Print-1 / Print-2 parity params to an existing query string (URL already has ?). */
  private withPrint1Params(url: string, print1Params?: string): string {
    if (print1Params) {
      return `${url}&${print1Params}`;
    }
    const defaultPrint2Params = this.buildPrint2Params({
      showTermsInPrint2: this.printSettingsService.getShowTermsInPrint2(),
      showBanksInPrint2: this.printSettingsService.getShowBanksInPrint2()
    });
    return defaultPrint2Params ? `${url}&${defaultPrint2Params}` : url;
  }

  printDocument(id: number, printType: string = 'A4Portrait', print1Params?: string): void {
    const printTypeValue = this.printTypeToEnum(printType);
    const url = this.withPrint1Params(`${this.salesInvoiceUrl}/document/${id}?printType=${printTypeValue}`, print1Params);

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (data) => {
        this.pdfUtilsService.printBlob(data);
      },
      error: (err) => {
        console.error('Error printing server document:', err);
        if (this.pdfUtilsService) {
          this.pdfUtilsService.showToast('تعذر طباعة الفاتورة من السيرفر', 'error');
        }
      }
    });
  }

  downloadDocument(id: number, printType: string = 'A4Portrait', print1Params?: string): void {
    const printTypeValue = this.printTypeToEnum(printType);
    const url = this.withPrint1Params(`${this.salesInvoiceUrl}/document/${id}?printType=${printTypeValue}`, print1Params);

    this.getInvoiceById(id).subscribe({
      next: (inv: any) => {
        const invNo = inv?.invoiceNo || inv?.invoiceNumber || `${id}`;
        const filename = `${invNo}.pdf`;
        this.http.get(url, { responseType: 'blob' }).subscribe({
          next: (data) => {
            this.pdfUtilsService.downloadFile(data, filename);
          },
          error: (err) => {
            console.error('Error downloading server document:', err);
            if (this.pdfUtilsService) {
              this.pdfUtilsService.showToast('تعذر تحميل الفاتورة من السيرفر', 'error');
            }
          }
        });
      },
      error: () => {
        this.http.get(url, { responseType: 'blob' }).subscribe({
          next: (data) => {
            this.pdfUtilsService.downloadFile(data, `${id}.pdf`);
          }
        });
      }
    });
  }

  getDocumentBlob(id: number, printType: string = 'A4Portrait', print1Params?: string): Observable<Blob> {
    const printTypeValue = this.printTypeToEnum(printType);
    const url = this.withPrint1Params(`${this.salesInvoiceUrl}/document/${id}?printType=${printTypeValue}`, print1Params);
    return this.http.get(url, { responseType: 'blob' });
  }

  printDocuments(ids: number[], printType: string = 'A4Portrait', onComplete?: () => void, print1Params?: string): void {
    if (!ids || ids.length === 0) return;
    const printTypeValue = this.printTypeToEnum(printType);
    const query = ids.map(i => `ids=${encodeURIComponent(i)}`).join('&');
    const url = this.withPrint1Params(`${this.salesInvoiceUrl}/documents?${query}&printType=${printTypeValue}`, print1Params);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (data) => {
        try {
          // unzipAndPrint is async — a corrupt ZIP produces a REJECTED promise, not a
          // synchronous throw, so catch it on the promise (the try/catch alone cannot).
          const p = this.pdfUtilsService.unzipAndPrint(data);
          p?.catch?.((e) => {
            console.error('Error processing server documents:', e);
            if (this.pdfUtilsService) this.pdfUtilsService.showToast('تعذر تجهيز ملفات الطباعة', 'error');
          });
        } catch (e) {
          console.error('Error processing server documents:', e);
        } finally {
          onComplete?.();
        }
      },
      error: () => onComplete?.()
    });
  }

  downloadDocuments(ids: number[], printType: string = 'A4Portrait', onComplete?: () => void, print1Params?: string): void {
    if (!ids || ids.length === 0) return;
    const printTypeValue = this.printTypeToEnum(printType);
    const query = ids.map(i => `ids=${encodeURIComponent(i)}`).join('&');
    const url = this.withPrint1Params(`${this.salesInvoiceUrl}/documents?${query}&printType=${printTypeValue}`, print1Params);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (data) => {
        try {
          // unzipAndDownload is async — a corrupt ZIP produces a REJECTED promise, not a
          // synchronous throw, so catch it on the promise (the try/catch alone cannot).
          const p = this.pdfUtilsService.unzipAndDownload(data);
          p?.catch?.((e) => {
            console.error('Error processing server documents:', e);
            if (this.pdfUtilsService) this.pdfUtilsService.showToast('تعذر تجهيز ملفات التنزيل', 'error');
          });
        } catch (e) {
          console.error('Error processing server documents:', e);
        } finally {
          onComplete?.();
        }
      },
      error: () => onComplete?.()
    });
  }

  downloadAllDocuments(): void {
    this.http.get(`${this.salesInvoiceUrl}/documents/all`, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.downloadFile(data, 'sales-invoices.zip');
    });
  }

  downloadMerged(ids: number[], printType: string = 'A4Portrait', onComplete?: () => void, print1Params?: string): void {
    if (!ids || ids.length === 0) return;
    // Use POST to avoid 414 URI Too Long when many ids
    const printTypeValue = this.printTypeToEnum(printType);
    const body: any = { ids, printType: printTypeValue };
    if (print1Params) {
      // Merge the parity params into the POST body with TYPED values — the backend
      // MergeRequest DTO has bool ShowStamp/ShowCompanySignature/ShowCustomerSignature
      // and a `Language` field (bound from `language`). Spreading raw URLSearchParams
      // values would send strings ("true") and fail model binding with HTTP 400.
      const p = new URLSearchParams(print1Params);
      body.language = p.get('lang') ?? 'ar';
      body.showStamp = (p.get('showStamp') ?? 'true') === 'true';
      body.showCompanySignature = (p.get('showCompanySignature') ?? 'true') === 'true';
      body.showCustomerSignature = (p.get('showCustomerSignature') ?? 'true') === 'true';
      if (p.has('showTermsInPrint2')) body.showTermsInPrint2 = p.get('showTermsInPrint2') === 'true';
      if (p.has('showBanksInPrint2')) body.showBanksInPrint2 = p.get('showBanksInPrint2') === 'true';
      const up = p.get('uncheckedPolicies');
      if (up) body.uncheckedPolicies = up;
      const ub = p.get('uncheckedBanks');
      if (ub) body.uncheckedBanks = ub;
      const o = p.get('orientation');
      if (o) body.orientation = o;
    }
    this.http.post(`${this.salesInvoiceUrl}/documents/merged`, body, { responseType: 'blob' }).subscribe({
      next: (data) => {
        try {
          this.pdfUtilsService.downloadFile(data, 'invoices-merged.pdf');
        } catch (e) {
          console.error('Error downloading merged documents:', e);
          if (this.pdfUtilsService) {
            this.pdfUtilsService.showToast('تعذر تجهيز ملف التنزيل', 'error');
          }
        } finally {
          onComplete?.();
        }
      },
      error: () => onComplete?.()
    });
  }

  downloadAllMerged(printType: string = 'A4Portrait', onComplete?: () => void, print1Params?: string): void {
    const printTypeValue = this.printTypeToEnum(printType);
    const url = this.withPrint1Params(`${this.salesInvoiceUrl}/documents/merged/all?printType=${printTypeValue}`, print1Params);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (data) => {
        try {
          this.pdfUtilsService.downloadFile(data, 'invoices-merged-all.pdf');
        } catch (e) {
          console.error('Error downloading all merged documents:', e);
          if (this.pdfUtilsService) {
            this.pdfUtilsService.showToast('تعذر تجهيز ملف التنزيل', 'error');
          }
        } finally {
          onComplete?.();
        }
      },
      error: () => onComplete?.()
    });
  }

  importFromExcel(file: File): Observable<SalesInvoiceImportResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<SalesInvoiceImportResult>(`${this.salesInvoiceUrl}/import`, formData);
  }
}
