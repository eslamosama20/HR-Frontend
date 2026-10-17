import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';
import {
  CashierReturnHistoryRecord,
  CashierReturnInvoiceDetail,
  CashierReturnInvoiceLine,
  CashierRefundMethod,
  CashierRefundReason,
  CashierRefundStatus
} from 'src/app/models/cashier/cashier-returns.model';
import { ReturnRequestDto, ReturnRequestResultDto } from 'src/app/models/cashier/pharmacy-prescription-pos.model';

@Injectable({
  providedIn: 'root'
})
export class CashierReturnsService {
  private readonly cashierUrl = `${environment.server_urls[environment.active_server].baseApi}cashier`;

  constructor(private http: HttpClient) {}

  getReturnHistory(status?: string, search?: string): Observable<CashierReturnHistoryRecord[]> {
    let params = new HttpParams();
    if (status && status !== 'all') params = params.set('status', status);
    if (search) params = params.set('search', search);

    return this.http.get<any>(`${this.cashierUrl}/refund/history`, { params }).pipe(
      map((response) => this.extractItems(response).map((row) => this.mapRefundHistory(row))),
      catchError((error) => {
        if (error?.status === 404) return of([]);
        return throwError(() => error);
      })
    );
  }

  getInvoiceDetails(invoiceKey: string): Observable<CashierReturnInvoiceDetail | null> {
    const term = (invoiceKey || '').trim();
    if (!term) {
      return throwError(() => new Error('INVOICE_KEY_REQUIRED'));
    }

    return this.http
      .get<any>(`${this.cashierUrl}/refund/search-invoice`, { params: new HttpParams().set('term', term) })
      .pipe(
        map((response) => this.mapInvoiceDetail(this.unwrap(response))),
        catchError(() => this.lookupInvoiceFromInvoiceApis(term))
      );
  }

  createReturnRequest(
    payload: ReturnRequestDto,
    context: {
      reason: CashierRefundReason;
      reasonText: string;
      cashierName: string;
      customerName: string;
      refundSubtotal: number;
      refundTaxAmount: number;
      refundTotalAmount: number;
    }
  ): Observable<ReturnRequestResultDto> {
    if (!payload.lines?.length) {
      return throwError(() => new Error('NO_LINES'));
    }

    const refundPayload = {
      reason: payload.reasonCode,
      reasonText: context.reasonText || payload.reasonCode,
      refundMethod: payload.refundMethod, // Send the string method code (e.g., 'original_method', 'cash', etc.)
      notes: payload.notes,
      customerName: context.customerName,
      items: payload.lines.map((line) => ({
        saleItemId: Number(line.invoiceLineId),
        itemCode: line.itemCode || '',
        itemName: line.itemName || '',
        quantity: line.returnQty,
        unitPrice: line.unitPrice || 0,
        refundAmount: line.refundAmount || 0
      }))
    };

    return this.http.post<any>(`${this.cashierUrl}/invoices/${payload.originalInvoiceId}/refund`, refundPayload).pipe(
      map((response) => this.mapReturnResult(response, payload, context))
    );
  }

  private lookupInvoiceFromInvoiceApis(term: string): Observable<CashierReturnInvoiceDetail | null> {
    if (/^\d+$/.test(term)) {
      return this.http.get<any>(`${this.cashierUrl}/invoice/${term}`).pipe(
        map((response) => this.mapInvoiceDetail(this.unwrap(response))),
        catchError(() => of(null))
      );
    }

    const params = new HttpParams().set('keyword', term).set('page', '1').set('pageSize', '10');
    return this.http.get<any>(`${this.cashierUrl}/invoices`, { params }).pipe(
      map((response) => {
        const invoice = this.extractItems(response).find((row) => {
          const invoiceNo = String(row?.invoiceNo ?? row?.InvoiceNo ?? row?.number ?? '').toLowerCase();
          return invoiceNo === term.toLowerCase() || invoiceNo.includes(term.toLowerCase());
        });
        return invoice ? this.mapInvoiceDetail(invoice) : null;
      }),
      catchError(() => of(null))
    );
  }

  private mapInvoiceDetail(source: any): CashierReturnInvoiceDetail | null {
    if (!source) return null;
    const items = this.extractInvoiceItems(source).map((item) => this.mapInvoiceLine(item));

    return {
      id: this.toNumber(source.id ?? source.invoiceId ?? source.InvoiceId),
      invoiceNo: this.toString(source.invoiceNo ?? source.InvoiceNo ?? source.number ?? source.referenceNo),
      invoiceDate: this.toDate(source.invoiceDate ?? source.createdAt ?? source.date),
      customerName: this.toString(source.customerName ?? source.customer?.name ?? source.clientName, '-'),
      customerPhone: this.toString(source.customerPhone ?? source.customer?.phone ?? source.phone, ''),
      cashierName: this.toString(source.cashierName ?? source.cashierUserName ?? source.createdByName, '-'),
      paymentMethod: this.mapPaymentMethod(source.paymentMethod ?? source.paymentType ?? source.paymentMethodId),
      items,
      subtotal: this.toNumber(source.subtotal ?? source.subTotal ?? source.netAmount),
      discountAmount: this.toNumber(source.discountAmount ?? source.discount),
      taxAmount: this.toNumber(source.taxAmount ?? source.tax ?? source.vatAmount),
      totalAmount: this.toNumber(source.totalAmount ?? source.total ?? source.grandTotal),
      paidAmount: this.toNumber(source.paidAmount ?? source.amountPaid ?? source.totalPaid ?? source.totalAmount)
    };
  }

  private mapInvoiceLine(item: any): CashierReturnInvoiceLine {
    const quantity = this.toNumber(item.quantity ?? item.qty);
    const alreadyReturned = this.toNumber(item.returnedQty ?? item.refundedQuantity ?? item.refundedQty);
    const unitPrice = this.toNumber(item.unitPrice ?? item.price);
    const totalAmount = this.toNumber(item.totalAmount ?? item.total ?? unitPrice * quantity);

    const maxReturnQty = item.maxReturnQty !== undefined
      ? this.toNumber(item.maxReturnQty)
      : Math.max(0, quantity - alreadyReturned);

    return {
      id: this.toNumber(item.id ?? item.saleItemId ?? item.invoiceLineId),
      itemId: this.toNumber(item.itemId ?? item.productId ?? item.mainPurchaseClassId),
      itemCode: this.toString(item.itemCode ?? item.code ?? item.barcode),
      itemName: this.toString(item.itemName ?? item.name ?? item.productName, '-'),
      itemBarcode: this.toString(item.itemBarcode ?? item.barcode),
      quantity,
      unitPrice,
      discountAmount: this.toNumber(item.discountAmount ?? item.discount),
      taxPercentage: this.toNumber(item.taxPercentage ?? item.vatPercentage ?? item.taxRate),
      taxAmount: this.toNumber(item.taxAmount ?? item.tax ?? item.vatAmount),
      totalAmount,
      unitName: this.toString(item.unitName ?? item.unit ?? item.uom, ''),
      maxReturnQty,
      returnQty: 0,
      selected: false
    };
  }

  private mapRefundHistory(source: any): CashierReturnHistoryRecord {
    return {
      id: this.toNumber(source.id ?? source.refundId ?? source.returnRequestId),
      refundNo: this.toString(source.refundNo ?? source.returnNo ?? source.referenceNo ?? source.id),
      refundDate: this.toDate(source.refundDate ?? source.returnDate ?? source.createdAt),
      originalInvoiceNo: this.toString(source.originalInvoiceNo ?? source.invoiceNo ?? source.invoice?.invoiceNo),
      customerName: this.toString(source.customerName ?? source.customer?.name, '-'),
      reason: this.mapReason(source.reasonCode ?? source.reason),
      reasonText: this.toString(source.reasonText ?? source.reason ?? source.reasonCode),
      refundMethod: this.mapRefundMethod(source.refundMethodCode ?? source.refundMethod),
      status: this.mapStatus(source.status ?? source.refundStatus),
      itemsCount: this.toNumber(source.itemsCount ?? source.linesCount ?? source.items?.length),
      refundSubtotal: this.toNumber(source.refundSubtotal ?? source.subtotal),
      refundTaxAmount: this.toNumber(source.refundTaxAmount ?? source.taxAmount),
      refundTotalAmount: this.toNumber(source.refundTotalAmount ?? source.refundAmount ?? source.totalAmount),
      cashierName: this.toString(source.cashierName ?? source.cashierUserName ?? source.createdByName, '-'),
      notes: this.toString(source.notes)
    };
  }

  private mapReturnResult(response: any, payload: ReturnRequestDto, context: { refundTotalAmount: number }): ReturnRequestResultDto {
    const body = this.unwrap(response) ?? response ?? {};
    return {
      returnRequestId: this.toString(body.returnRequestId ?? body.refundNo ?? body.refundId ?? body.id ?? payload.originalInvoiceNo),
      status: this.mapStatus(body.status ?? body.refundStatus) === 'completed' ? 'accepted' : 'pending',
      refundTotalAmount: this.toNumber(body.refundTotalAmount ?? body.refundAmount ?? body.totalAmount ?? context.refundTotalAmount),
      message: this.toString(body.message ?? body.messageAr)
    };
  }

  private extractInvoiceItems(source: any): any[] {
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.invoiceItems)) return source.invoiceItems;
    if (Array.isArray(source?.lines)) return source.lines;
    if (Array.isArray(source?.saleItems)) return source.saleItems;
    return [];
  }

  private extractItems(source: any): any[] {
    if (Array.isArray(source)) return source;
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.data)) return source.data;
    if (Array.isArray(source?.result?.items)) return source.result.items;
    if (Array.isArray(source?.result)) return source.result;
    return [];
  }

  private unwrap(source: any): any {
    return source?.data ?? source?.result ?? source;
  }

  private mapPaymentMethod(value: any): PaymentMethod {
    const normalized = String(value ?? '').toLowerCase();
    if (value === 0 || value === 1 || normalized === 'cash') return PaymentMethod.Cash;
    if (value === 2 || normalized === 'card' || normalized === 'mada') return PaymentMethod.Card;
    if (value === 3 || normalized === 'credit') return PaymentMethod.Credit;
    if (value === 4 || normalized === 'mixed' || normalized === 'split') return PaymentMethod.Mixed;
    if (normalized.includes('bank')) return PaymentMethod.BankTransfer;
    return PaymentMethod.Cash;
  }

  private mapRefundMethodToBackend(method: CashierRefundMethod): number {
    switch (method) {
      case 'cash': return 1;
      case 'card': return 2;
      case 'credit_note': return 3;
      case 'original_method':
      default: return 0;
    }
  }

  private mapRefundMethod(value: any): CashierRefundMethod {
    const normalized = String(value ?? '').toLowerCase();
    if (value === 1 || normalized === 'cash') return 'cash';
    if (value === 2 || normalized === 'card') return 'card';
    if (value === 3 || normalized.includes('credit')) return 'credit_note';
    return 'original_method';
  }

  private mapReason(value: any): CashierRefundReason {
    const normalized = String(value ?? '').toLowerCase();
    const allowed: CashierRefundReason[] = ['defective', 'wrong_item', 'customer_changed_mind', 'expired', 'damaged', 'other'];
    return allowed.includes(normalized as CashierRefundReason) ? normalized as CashierRefundReason : 'other';
  }

  private mapStatus(value: any): CashierRefundStatus {
    const normalized = String(value ?? '').toLowerCase();
    if (value === 1 || normalized === 'approved') return 'approved';
    if (value === 2 || normalized === 'completed' || normalized === 'accepted' || normalized === 'refunded') return 'completed';
    if (value === 3 || normalized === 'rejected' || normalized === 'failed') return 'rejected';
    return 'pending';
  }

  private toDate(value: any): Date {
    const parsed = value ? new Date(value) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private toNumber(value: any): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toString(value: any, fallback = ''): string {
    const text = `${value ?? ''}`.trim();
    return text || fallback;
  }
}
