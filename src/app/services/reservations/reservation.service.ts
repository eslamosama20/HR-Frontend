import { Injectable } from '@angular/core';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { ReservationModel } from 'src/app/models/accounting/reservation-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PdfUtilsService } from '../pdf-utils.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ReservationPrintTemplateCommandModel } from '../../models/reservation/reservation-print-template-command.model';
import { ReservationActionLogResponseDto } from '../../models/reservation/reservation-action-log-response.model';
import { FilterMetadata } from 'primeng/api';
import { ConfirmReservationResponseDto } from '../../models/reservation/confirm-reservation-response.model';

@Injectable({
  providedIn: 'root',
})
export class ReservationService extends ServiceBase<ReservationModel> {
  constructor(
    apiCaller: ApiCallerService,
    private pdfUtilsService: PdfUtilsService,
    private http: HttpClient
  ) {
    super(apiCaller, 'reservation', ReservationModel, Servers.baseApi);
  }

  // جلب عدة حجوزات بـ request واحد بدلاً من N requests
  getByIds(ids: string[]): Observable<any[]> {
    const base = environment.server_urls[environment.active_server][this.server_url];
    const params = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    return this.http.get<any[]>(`${base}reservation/by-ids?${params}`);
  }

  createTransaction(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/create-transaction/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(map((data) => data));
  }
  sendToZatca(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/send-to-zatca/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(map((data) => data));
  }
  shareReservationByEmail(reservationId: string, email: string) {
    const base =
      environment.server_urls[environment.active_server][this.server_url];
    const body = { method: 'Email' as const, receiver: email };
    // لاحظ Reservation بحرف R كبير
    return this.http.post<any>(
      `${base}Reservation/${reservationId}/share`,
      body
    );
  }

  shareReservationsByEmail(ids: string[], email: string) {
    const base =
      environment.server_urls[environment.active_server][this.server_url];
    const body = { ids, method: 'Email' as const, receiver: email };
    // ولاحظ أيضاً Reservation بحرف R كبير
    return this.http.post<any>(`${base}Reservation/reservations/share`, body);
  }
  shareReservationByWhatsapp(reservationId: string, phone: string) {
    const base =
      environment.server_urls[environment.active_server][this.server_url];
    const body = { method: 'Whatsapp' as const, receiver: phone };
    // لاحظ Reservation بحرف R كبير
    return this.http.post<any>(
      `${base}Reservation/${reservationId}/whatsappShare`,
      body
    );
  }
  getNewReferenceNumber(): Observable<string> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/next-reference-number`; // ← عدّلها لو مختلف
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => res.referenceNumber ?? res)
    );
  }

  shareReservationsByWhatsapp(ids: string[], phone: string) {
    const base =
      environment.server_urls[environment.active_server][this.server_url];
    const body = { ids, method: 'Whatsapp' as const, receiver: phone };
    // ولاحظ أيضاً Reservation بحرف R كبير
    return this.http.post<any>(
      `${base}Reservation/reservations/whatsappShare`,
      body
    );
  }

  printDocument(id: string): void {
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/document/${id}`,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.printBlob(data);
      });
  }

  getDocumentBlob(id: string): Observable<Blob> {
    const base = environment.server_urls[environment.active_server][this.server_url];
    return this.http.get(`${base}reservation/document/${id}`, { responseType: 'blob' });
  }

  downloadDocument(id: string, refNum?: string, showToast: boolean = true): void {
    if (showToast) this.pdfUtilsService.showToast('FINANCE.PREPARING_DOCUMENT', 'info', 4000);
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/document/${id}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, `${refNum || id}.pdf`);
          if (showToast) this.pdfUtilsService.showToast('FINANCE.DOCUMENT_DOWNLOADED_SUCCESS', 'success', 3000);
        },
        error: () => {
          if (showToast) this.pdfUtilsService.showToast('FINANCE.DOCUMENT_DOWNLOAD_FAILED', 'error', 4000);
        }
      });
  }

  printDocuments(ids: string[]): void {
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/documents?ids=${ids.join(',')}`,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.unzipAndPrint(data);
      });
  }

  downloadDocuments(ids: string[]): void {
    this.pdfUtilsService.showToast('FINANCE.PREPARING_DOCUMENTS', 'info', 5000);
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/documents?ids=${ids.join(',')}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.unzipAndDownload(data);
          this.pdfUtilsService.showToast('FINANCE.DOCUMENTS_DOWNLOADED_SUCCESS', 'success', 3000);
        },
        error: () => {
          this.pdfUtilsService.showToast('FINANCE.DOCUMENTS_DOWNLOAD_FAILED', 'error', 4000);
        }
      });
  }

  printCostSheet(id: string): void {
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/costsheet/${id}`,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.printBlob(data);
      });
  }

  downloadCostSheet(id: string, refNum?: string, showToast: boolean = true): void {
    if (showToast) this.pdfUtilsService.showToast('FINANCE.PREPARING_DOCUMENT', 'info', 4000);
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/costsheet/${id}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, `Cost Sheet (${refNum || id}).pdf`);
          if (showToast) this.pdfUtilsService.showToast('FINANCE.DOCUMENT_DOWNLOADED_SUCCESS', 'success', 3000);
        },
        error: () => {
          if (showToast) this.pdfUtilsService.showToast('FINANCE.DOCUMENT_DOWNLOAD_FAILED', 'error', 4000);
        }
      });
  }

  printCostSheets(ids: string[]): void {
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/costsheets?ids=${ids.join(',')}`,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.unzipAndPrint(data);
      });
  }

  downloadCostSheets(ids: string[]): void {
    this.pdfUtilsService.showToast('FINANCE.PREPARING_DOCUMENTS', 'info', 5000);
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/costsheets?ids=${ids.join(',')}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.unzipAndDownload(data);
          this.pdfUtilsService.showToast('FINANCE.DOCUMENTS_DOWNLOADED_SUCCESS', 'success', 3000);
        },
        error: () => {
          this.pdfUtilsService.showToast('FINANCE.DOCUMENTS_DOWNLOAD_FAILED', 'error', 4000);
        }
      });
  }

  printHotelRequest(id: string): void {
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/hotelrequest/${id}`,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.printBlob(data);
      });
  }

  downloadHotelRequest(id: string, refNum?: string, showToast: boolean = true): void {
    if (showToast) this.pdfUtilsService.showToast('FINANCE.PREPARING_DOCUMENT', 'info', 4000);
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/hotelrequest/${id}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, `Hotel Request (${refNum || id}).pdf`);
          if (showToast) this.pdfUtilsService.showToast('FINANCE.DOCUMENT_DOWNLOADED_SUCCESS', 'success', 3000);
        },
        error: () => {
          if (showToast) this.pdfUtilsService.showToast('FINANCE.DOCUMENT_DOWNLOAD_FAILED', 'error', 4000);
        }
      });
  }

  printHotelRequests(ids: string[]): void {
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/hotelrequests?ids=${ids.join(',')}`,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.unzipAndPrint(data);
      });
  }

  downloadHotelRequests(ids: string[]): void {
    this.pdfUtilsService.showToast('FINANCE.PREPARING_DOCUMENTS', 'info', 5000);
    this.http
      .get(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/hotelrequests?ids=${ids.join(',')}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.unzipAndDownload(data);
          this.pdfUtilsService.showToast('FINANCE.DOCUMENTS_DOWNLOADED_SUCCESS', 'success', 3000);
        },
        error: () => {
          this.pdfUtilsService.showToast('FINANCE.DOCUMENTS_DOWNLOAD_FAILED', 'error', 4000);
        }
      });
  }

  printReservationsTemplate(
    request: ReservationPrintTemplateCommandModel
  ): void {
    this.http
      .post(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/print-template`,
        request,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.printBlob(data);
      });
  }

  downloadReservationsTemplate(
    request: ReservationPrintTemplateCommandModel
  ): void {
    this.http
      .post(
        `${
          environment.server_urls[environment.active_server][this.server_url]
        }reservation/download-template`,
        request,
        { responseType: 'blob' }
      )
      .subscribe((data) => {
        this.pdfUtilsService.downloadFile(data, `documents.pdf`);
      });
  }
  getAllFrontalReservations(): Observable<ReservationModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/frontal`;
    request.server_url = this.server_url;
  
    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        return list.map((item: any) => new ReservationModel(item));
      })
    );
  }
getPage(
  pageNumber: number = 1,
  pageSize: number = 10,
  sortField: string = 'createdAt',
  sortOrder: number = -1,
  filters?: Record<string, FilterMetadata | FilterMetadata[]>,
  searchField?: string,
  searchValue?: string
): Observable<{ data: ReservationModel[]; totalCount: number }> {

  const request = new APIRequest();
  request.verb = HTTPVerbs.get;

  const sortDir = sortOrder === 1 ? 'asc' : 'desc';

  let endpoint =
    `${this.endpoint}?pageNumber=${pageNumber}&pageSize=${pageSize}` +
    `&sortField=${encodeURIComponent(sortField)}` +
    `&sortDir=${sortDir}`;

  // ✅ ابعت filters للباك (JSON)
  if (filters && Object.keys(filters).length) {
    endpoint += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
  }

  if (searchField && searchValue !== undefined && searchValue !== null && searchValue !== '') {
    endpoint += `&searchField=${encodeURIComponent(searchField)}&searchValue=${encodeURIComponent(searchValue)}`;
  }

  request.endpoint = endpoint;
  request.server_url = this.server_url;

  return this.apiCaller.callApi(request).pipe(
    map((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      const totalCount = Array.isArray(res) ? list.length : (res?.totalCount ?? 0);

      return {
        data: list.map((item: any) => new ReservationModel(item)),
        totalCount
      };
    })
  );
}



  

  makeFrontal(id: string): Observable<ReservationModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller
      .callApi(request)
      .pipe(map((data) => new ReservationModel(data)));
  }

  createPurchase(purchaseData: any): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `HotelAllotmentInvoice`; // Use HotelAllotmentInvoice endpoint
    request.body = purchaseData;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  createPurchaseTransaction(id: number): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `HotelAllotmentInvoice/CreateTransaction?id=${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }
// ✅ NEW: تعديل / إلغاء فاتورة HotelAllotmentInvoice (PUT)
updateHotelAllotmentInvoice(payload: any): Observable<any> {
  const request = new APIRequest();
  request.verb = HTTPVerbs.put;
  request.endpoint = `HotelAllotmentInvoice`; // PUT بدون /id حسب swagger اللي عندك
  request.body = payload;
  request.server_url = this.server_url;

  return this.apiCaller.callApi(request);
}

  getAllPurchases(): Observable<any[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `HotelAllotmentInvoice`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(map((res) => res?.data || []));
  }

  getPurchaseById(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `HotelAllotmentInvoice/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  printAllotmentDocument(id: number, printType: string = 'A4Portrait'): void {
    const printTypeMap: { [key: string]: number } = {
      'A4Portrait': 0,
      'A4Landscape': 1,
      'Thermal80mm': 2,
      'Thermal58mm': 3
    };
    const printTypeValue = printTypeMap[printType] ?? 0;

    this.http
      .get(
        `${environment.server_urls[environment.active_server][this.server_url]}HotelAllotmentInvoice/document/${id}?printType=${printTypeValue}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.printBlob(data);
        },
        error: () => {
          console.error('Failed to print document');
        }
      });
  }

  downloadAllotmentDocument(id: number, printType: string = 'A4Portrait'): void {
    const printTypeMap: { [key: string]: number } = {
      'A4Portrait': 0,
      'A4Landscape': 1,
      'Thermal80mm': 2,
      'Thermal58mm': 3
    };
    const printTypeValue = printTypeMap[printType] ?? 0;

    this.http
      .get(
        `${environment.server_urls[environment.active_server][this.server_url]}HotelAllotmentInvoice/document/${id}?printType=${printTypeValue}`,
        { responseType: 'blob' }
      )
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, `reservation-invoice-${id}.pdf`);
        },
        error: () => {
          console.error('Failed to download document');
        }
      });
  }

  printAllotmentDocuments(ids: number[]): void {
    if (!ids || ids.length === 0) return;
    const base = environment.server_urls[environment.active_server][this.server_url];
    const query = ids.map(i => `ids=${encodeURIComponent(i)}`).join('&');
    this.http
      .get(`${base}HotelAllotmentInvoice/documents?${query}`, { responseType: 'blob' })
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.unzipAndPrint(data);
        },
        error: () => {
          console.error('Failed to print documents');
        }
      });
  }

  downloadAllotmentDocuments(ids: number[]): void {
    const base = environment.server_urls[environment.active_server][this.server_url];
    this.http
      .get(`${base}HotelAllotmentInvoice/documents?ids=${ids.join('&ids=')}`, { responseType: 'blob' })
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.unzipAndDownload(data);
        },
        error: () => {
          console.error('Failed to download documents');
        }
      });
  }

  printAllotmentMerged(ids: number[]): void {
    const base = environment.server_urls[environment.active_server][this.server_url];
    this.http
      .post(`${base}HotelAllotmentInvoice/documents/merged`, { ids }, { responseType: 'blob' })
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.printBlob(data);
        },
        error: () => {
          console.error('Failed to print merged document');
        }
      });
  }

  downloadAllotmentMerged(ids: number[]): void {
    const base = environment.server_urls[environment.active_server][this.server_url];
    this.http
      .post(`${base}HotelAllotmentInvoice/documents/merged`, { ids }, { responseType: 'blob' })
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, 'reservation-invoices-merged.pdf');
        },
        error: () => {
          console.error('Failed to download merged document');
        }
      });
  }

  downloadAllAllotmentDocuments(): void {
    const base = environment.server_urls[environment.active_server][this.server_url];
    this.http
      .get(`${base}HotelAllotmentInvoice/documents/all`, { responseType: 'blob' })
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, 'reservation-invoices.zip');
        },
        error: () => {
          console.error('Failed to download all documents');
        }
      });
  }

  downloadAllAllotmentMerged(): void {
    const base = environment.server_urls[environment.active_server][this.server_url];
    this.http
      .get(`${base}HotelAllotmentInvoice/documents/merged/all`, { responseType: 'blob' })
      .subscribe({
        next: (data) => {
          this.pdfUtilsService.downloadFile(data, 'reservation-invoices-merged-all.pdf');
        },
        error: () => {
          console.error('Failed to download all merged document');
        }
      });
  }

  createPaymentSchedule(paymentData: any): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `PaymentSchedule`;
    request.body = paymentData;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  getReservationsCount(): Observable<number> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}?pageNumber=1&pageSize=1`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        return res?.totalCount ?? (Array.isArray(res) ? res.length : 0);
      })
    );
  }

  confirmReservation(id: string): Observable<ConfirmReservationResponseDto> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${id}/confirm`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  cancelReservation(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${id}/cancel`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  reactivateReservation(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${id}/reactivate`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request);
  }

  getReservationLogs(id: string): Observable<ReservationActionLogResponseDto[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `Reservation/${id}/logs`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(map((res: any) => (res || []) as ReservationActionLogResponseDto[]));
  }
}
