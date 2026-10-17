import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  CheckoutPaymentOption,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentMethodDto
} from 'src/app/models/cashier/payment-orchestration.model';

/**
 * PaymentOrchestrationService
 * ============================
 * Shared electronic payment engine for ALL POS checkout flows:
 *  - Quick Sale / Normal Cashier
 *  - Pharmacy Prescription Dispense
 *  - Insurance Co-Pay
 *  - Future: Zid / Salla e-commerce
 *
 * API Contract:
 *   GET  /api/payments/methods?country=SA
 *   POST /api/payments
 *
 * Phase-1 Note:
 *   No polling. Manual cashier confirmation after gateway redirect.
 *   Once backend provides GET /api/payments/{internalId}, inject polling here
 *   with minimal changes to consumers.
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentOrchestrationService {

  /** Resolved base API URL — same origin as all other cashier services */
  private readonly paymentsUrl: string;

  /** Cached observable for payment methods — re-fetched only once per app lifecycle */
  private methodsCache$: Observable<PaymentMethodDto[]> | null = null;

  /** The callback URL the gateway will redirect to after payment */
  private readonly callbackUrl: string;

  constructor(private http: HttpClient) {
    const base = environment.server_urls[environment.active_server];
    const serverRoot: string = (base as any)?.serverUrl || (base as any)?.baseApi?.replace('/api/', '/') || 'http://localhost:5001/';
    this.paymentsUrl = `${serverRoot.replace(/\/$/, '')}/api/payments`;

    // Callback URL: use current origin + a dedicated route for future webhook handling
    this.callbackUrl = `${window.location.origin}/payment/callback`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/payments/methods?country=SA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fetches available electronic payment methods from the backend.
   * Result is cached for the session lifetime to avoid repeated calls.
   * Returns [] on error (graceful degradation — do not break the checkout flow).
   */
  getMethods(country: string = 'SA'): Observable<PaymentMethodDto[]> {
    if (this.methodsCache$) {
      return this.methodsCache$;
    }

    const params = new HttpParams().set('country', country);
    this.methodsCache$ = this.http
      .get<PaymentMethodDto[]>(`${this.paymentsUrl}/methods`, { params })
      .pipe(
        catchError(() => {
          this.methodsCache$ = null; // Allow retry on next attempt
          return of([] as PaymentMethodDto[]);
        }),
        shareReplay(1)
      );

    return this.methodsCache$;
  }

  /**
   * Forces a fresh reload of payment methods (e.g., after network error).
   */
  invalidateMethodsCache(): void {
    this.methodsCache$ = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/payments
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates an electronic payment session and returns the payment URL.
   * The caller should open the returned `paymentUrl` in a new browser tab.
   */
  createPayment(request: CreatePaymentRequest): Observable<CreatePaymentResponse> {
    return this.http.post<CreatePaymentResponse>(this.paymentsUrl, request);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Future: GET /api/payments/{internalId}   (Phase 2 — not yet available)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // getPaymentStatus(internalId: string): Observable<PaymentStatusResponse> {
  //   return this.http.get<PaymentStatusResponse>(`${this.paymentsUrl}/${internalId}`);
  // }
  //
  // pollPaymentStatus(internalId: string, intervalMs = 4000): Observable<PaymentStatusResponse> {
  //   return interval(intervalMs).pipe(
  //     switchMap(() => this.getPaymentStatus(internalId)),
  //     takeWhile(res => res.status === 'Pending', true)
  //   );
  // }

  // ─────────────────────────────────────────────────────────────────────────
  // UI Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Builds the full checkout payment options list for the UI.
   * Always includes Cash + Credit (existing) plus fetched electronic methods.
   * Insurance is added only if the caller passes `includeInsurance = true`.
   *
   * @param electronicMethods - result of getMethods()
   * @param includeInsurance  - true for pharmacy/medical flows
   */
  buildCheckoutOptions(
    electronicMethods: PaymentMethodDto[],
    includeInsurance: boolean = false
  ): CheckoutPaymentOption[] {
    const staticOptions: CheckoutPaymentOption[] = [
      { key: 'cash',   label: 'نقداً',          icon: 'pi-wallet',      isElectronic: false },
      { key: 'credit', label: 'آجل / ائتمان',   icon: 'pi-calendar-plus', isElectronic: false },
    ];

    if (includeInsurance) {
      staticOptions.push({
        key: 'insurance', label: 'تأمين', icon: 'pi-shield', isElectronic: false
      });
    }

    const dynamicOptions: CheckoutPaymentOption[] = electronicMethods.map(m => ({
      key: m.key,
      label: this.arabicLabel(m.key, m.label),
      icon: this.methodIcon(m.key),
      isElectronic: true
    }));

    return [...staticOptions, ...dynamicOptions];
  }

  /**
   * Builds the full CreatePaymentRequest payload.
   * Provides safe fallbacks for optional customer fields.
   */
  buildRequest(params: {
    orderReference: string;
    amount: number;
    methodKey: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    description?: string;
  }): CreatePaymentRequest {
    return {
      orderReference: params.orderReference,
      amount: params.amount,
      currency: 'SAR',
      paymentMethod: params.methodKey,
      customerName: params.customerName?.trim() || 'عميل',
      customerEmail: params.customerEmail?.trim() || 'noemail@guest.com',
      customerPhone: params.customerPhone?.trim() || '+966000000000',
      description: params.description?.trim() || `فاتورة ${params.orderReference}`,
      callbackUrl: this.callbackUrl
    };
  }

  /**
   * Opens the payment URL in a new browser tab.
   * Returns false if pop-up was blocked (caller should show manual link).
   */
  openPaymentUrl(paymentUrl: string): boolean {
    const win = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    return win !== null;
  }

  /**
   * Copies the payment URL to the clipboard.
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private arabicLabel(key: string, fallback: string): string {
    const labels: Record<string, string> = {
      card:      'بطاقة ائتمان',
      mada:      'مدى',
      apple_pay: 'Apple Pay',
      tabby:     'تابي — تقسيط',
      tamara:    'تمارا — تقسيط',
      stc_pay:   'STC Pay'
    };
    return labels[key] || fallback;
  }

  private methodIcon(key: string): string {
    const icons: Record<string, string> = {
      card:      'pi-credit-card',
      mada:      'pi-credit-card',
      apple_pay: 'pi-apple',
      tabby:     'pi-tag',
      tamara:    'pi-tag',
      stc_pay:   'pi-mobile'
    };
    return icons[key] || 'pi-credit-card';
  }
}
