import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from 'src/app/enums/servers';
import { PaymentModel, CreatePaymentRequest, UpdatePaymentRequest, PaymentResponse } from 'src/app/models/payment/payment.model';
import { PaymentScheduleModel, PaymentScheduleInvoiceType, CreatePaymentScheduleRequest, PaymentScheduleResponse } from 'src/app/models/payment/payment-schedule.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private endpoint = 'PaymentSchedule';
  private serverUrl = Servers.baseApi;

  constructor(private apiCaller: ApiCallerService) { }

  /**
   * Get all payments for a specific invoice
   * GET /api/PaymentSchedule/{invoiceId}/{invoiceType}
   * @param invoiceId The invoice ID
   * @param invoiceType The invoice type (1 for Sales Invoice based on API docs)
   */
  getPaymentsByInvoice(invoiceId: string, invoiceType: number): Observable<PaymentModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${invoiceId}/${invoiceType}`;
    request.server_url = this.serverUrl;

    return this.apiCaller.callApi(request).pipe(
      map((response: PaymentResponse[] | PaymentResponse | any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response.map((item: PaymentResponse) => new PaymentModel(item));
        } else if (response?.data && Array.isArray(response.data)) {
          return response.data.map((item: PaymentResponse) => new PaymentModel(item));
        } else if (response && typeof response === 'object' && response.id) {
          // Single object response
          return [new PaymentModel(response)];
        }
        return [];
      })
    );
  }

  /**
   * Create a new payment
   * POST /api/PaymentSchedule
   * @param payment The payment data to create
   */
  createPayment(payment: CreatePaymentRequest): Observable<PaymentModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = this.serverUrl;
    request.body = payment;

    return this.apiCaller.callApi(request).pipe(
      map((response: PaymentResponse | any) => {
        const data = response?.data || response;
        return new PaymentModel(data);
      })
    );
  }

  /**
   * Update an existing payment
   * PUT /api/PaymentSchedule
   * @param payment The payment data to update (includes id)
   */
  updatePayment(payment: UpdatePaymentRequest): Observable<PaymentModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = this.endpoint;
    request.server_url = this.serverUrl;
    request.body = payment;

    return this.apiCaller.callApi(request).pipe(
      map((response: PaymentResponse | any) => {
        const data = response?.data || response;
        return new PaymentModel(data);
      })
    );
  }

  /**
   * Delete a payment by ID
   * DELETE /api/PaymentSchedule/{id}
   * @param paymentId The payment ID to delete
   */
  deletePayment(paymentId: string): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/${paymentId}`;
    request.server_url = this.serverUrl;

    return this.apiCaller.callApi(request).pipe(
      map(() => void 0)
    );
  }

  /**
   * Get payment schedules for a specific invoice
   * GET /api/PaymentSchedule/{invoiceId}/{invoiceType}
   * @param invoiceId The invoice ID
   * @param invoiceType The invoice type (1=Sales, 2=Purchase, 3=Reservation)
   */
  getPaymentSchedulesByInvoice(invoiceId: string, invoiceType: PaymentScheduleInvoiceType): Observable<PaymentScheduleModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${invoiceId}/${invoiceType}`;
    request.server_url = this.serverUrl;

    return this.apiCaller.callApi(request).pipe(
      map((response: PaymentScheduleResponse[] | PaymentScheduleResponse | any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response.map((item: PaymentScheduleResponse) => new PaymentScheduleModel(item));
        } else if (response?.data && Array.isArray(response.data)) {
          return response.data.map((item: PaymentScheduleResponse) => new PaymentScheduleModel(item));
        } else if (response && typeof response === 'object' && response.id) {
          return [new PaymentScheduleModel(response)];
        }
        return [];
      })
    );
  }

  /**
   * Create a new payment schedule
   * POST /api/PaymentSchedule
   * @param paymentSchedule The payment schedule data to create
   */
  createPaymentSchedule(paymentSchedule: CreatePaymentScheduleRequest): Observable<PaymentScheduleModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = this.serverUrl;
    request.body = paymentSchedule;

    return this.apiCaller.callApi(request).pipe(
      map((response: PaymentScheduleResponse | any) => {
        const data = response?.data || response;
        return new PaymentScheduleModel(data);
      })
    );
  }
  /**
   * Get paycheck receipts for a specific invoice
   * GET /api/receipts/PaycheckReceipt?SaleInvoiceId={invoiceId}
   */
  getPaycheckReceiptsByInvoice(invoiceId: string): Observable<any[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `receipts/PaycheckReceipt/ByInvoice/${invoiceId}`;
    request.server_url = this.serverUrl;

    return this.apiCaller.callApi(request).pipe(
      map((response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      })
    );
  }

  /**
   * ربط سند صرف بدفعة مجدولة
   * PUT /api/PaymentSchedule/{scheduleId}/link-receipt
   * @param scheduleId معرف الدفعة المجدولة
   * @param paycheckReceiptId معرف سند الصرف
   * @param receiptNo رقم السند
   */
  linkReceiptToSchedule(scheduleId: string, paycheckReceiptId: string, receiptNo: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = `${this.endpoint}/${scheduleId}/link-receipt`;
    request.server_url = this.serverUrl;
    request.body = { paycheckReceiptId, receiptNo };

    return this.apiCaller.callApi(request).pipe(
      map((response: any) => response?.data || response)
    );
  }
}
