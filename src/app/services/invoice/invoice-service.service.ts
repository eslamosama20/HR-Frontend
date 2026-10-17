import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Invoice } from 'src/app/models/invoice/invoice';
import { InvoiceNo } from 'src/app/models/invoice/invoiceNo';
import { PurchaseInvoiceDetails } from 'src/app/models/invoice/purchase-invoice-details';
import { BaseResponse } from 'src/app/models/base-response';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from 'src/app/enums/servers';
import { PdfUtilsService } from '../pdf-utils.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private baseUrl = environment.server_urls[environment.active_server].salesInvoiceUrl;
  private purchaseInvoiceUrl = environment.server_urls[environment.active_server].purchaseInvoiceUrl;
  private invoiceNoUrl = this.baseUrl + 'InvoiceNo';
  private server_url = Servers.purchaseInvoiceUrl;
  private endpoint = 'Report/Details';
  private reportBaseUrl = environment.server_urls[environment.active_server][this.server_url];
  
  constructor(
    private http: HttpClient,
    private apiCaller: ApiCallerService,
    private pdfUtilsService: PdfUtilsService
  ) { }

  getAllInvoices():
    Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.baseUrl);
  }

  getAllInvoicesByType(typeId: number): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.baseUrl}ByTypeId/${typeId}`);
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}${id}`);
  }

  create(invoice: Invoice): Observable<Invoice> {
    return this.http.post<Invoice>(this.baseUrl, invoice);
  }

  update(id: number, invoice: Invoice): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}${id}`, invoice);
  }

  deleteInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}`);
  }

  GetInvoiceNo(): Observable<InvoiceNo> {
    return this.http.get<InvoiceNo>(this.invoiceNoUrl);
  }

  GetPurchaseInvoicesDetails(fromDate: string, toDate: string): Observable<BaseResponse<PurchaseInvoiceDetails[]>> {
    let searchRequest = {
      fromDate: fromDate,
      toDate: toDate
    };

    return this.http.post<BaseResponse<PurchaseInvoiceDetails[]>>(`${this.purchaseInvoiceUrl}/Report/Details`, searchRequest);
  }

  sharePurchaseInvoiceReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `/${this.endpoint}/share`;
    request.body = {
      startDate,
      endDate,
      method: 'Email',
      receiver: email,
      language: language
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  sharePurchaseInvoiceReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `/${this.endpoint}/whatsappShare`;
    request.body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  downloadPurchaseInvoiceReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.purchaseInvoiceUrl}/${this.endpoint}/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printPurchaseInvoiceReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.purchaseInvoiceUrl}/${this.endpoint}/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  downloadPurchaseInvoiceSummaryReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.purchaseInvoiceUrl}/${this.endpoint}/summary-document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  printPurchaseInvoiceSummaryReportDocument(startDate: string, endDate: string, language: string = 'ar'): void {
    const url = `${this.purchaseInvoiceUrl}/${this.endpoint}/summary-document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    this.http.get(url, { responseType: 'blob' }).subscribe(data => {
      this.pdfUtilsService.printBlob(data);
    });
  }

  // Net Sales VAT Report Methods
  getNetSalesVATReport(startDate: string, endDate: string): Observable<any> {
    const url = `${this.baseUrl}/NetVATReport?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<any>(url);
  }

  downloadNetSalesVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/NetVATReport/download?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  shareNetSalesVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
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

  shareNetSalesVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
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

  // ===================== Net Due VAT Report =====================

  getNetDueVATReport(startDate: string, endDate: string): Observable<any> {
    const url = `${this.baseUrl}/NetDueVATReport?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get(url);
  }

  downloadNetDueVATReportDocument(startDate: string, endDate: string, language: string = 'ar'): Observable<Blob> {
    const url = `${this.baseUrl}/NetDueVATReport/document?startDate=${startDate}&endDate=${endDate}&language=${language}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  shareNetDueVATReportByEmail(startDate: string, endDate: string, email: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/NetDueVATReport/share`;
    const body = {
      startDate,
      endDate,
      method: 'email',
      receiver: email,
      language: language
    };
    return this.http.post(url, body);
  }

  shareNetDueVATReportByWhatsapp(startDate: string, endDate: string, phone: string, language: string = 'ar'): Observable<any> {
    const url = `${this.baseUrl}/NetDueVATReport/share`;
    const body = {
      startDate,
      endDate,
      method: 'WhatsApp',
      receiver: phone,
      language: language
    };
    return this.http.post(url, body);
  }

}
