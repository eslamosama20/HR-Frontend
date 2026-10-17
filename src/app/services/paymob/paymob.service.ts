import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface PaymobAuthResponse {
  token: string;
}

export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  delivery_needed: boolean;
  merchant: any;
  collector: any;
  amount_cents: number;
  shipping_data: any;
  currency: string;
  is_payment_locked: boolean;
  merchant_order_id: string;
  wallet_notification: any;
  paid_amount_cents: number;
  notify_user_with_email: boolean;
  items: any[];
  order_url: string;
  commission_fees: number;
  delivery_fees_cents: number;
  delivery_vat_cents: number;
  payment_method: string;
  merchant_staff_tag: any;
  api_source: string;
  data: any;
}

export interface PaymobPaymentKeyResponse {
  token: string;
}

export interface PaymobBillingData {
  apartment: string;
  email: string;
  floor: string;
  first_name: string;
  street: string;
  building: string;
  phone_number: string;
  shipping_method: string;
  postal_code: string;
  city: string;
  country: string;
  last_name: string;
  state: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymobService {
  private baseUrl = environment.paymob.baseUrl;
  private apiKey = environment.paymob.apiKey;
  private integrationId = environment.paymob.integrationId;

  constructor(private http: HttpClient) { }

  /**
   * Step 1: Authentication - Get auth token
   */
  private authenticate(): Observable<string> {
    const url = `${this.baseUrl}/auth/tokens`;
    const body = {
      api_key: this.apiKey
    };

    console.log('🔐 Paymob Authentication Request:', {
      url,
      apiKey: this.apiKey.substring(0, 20) + '...',
      fullBody: body
    });

    return this.http.post<PaymobAuthResponse>(url, body).pipe(
      map(response => {
        console.log('✅ Paymob Authentication Success:', response);
        return response.token;
      }),
      catchError(error => {
        console.error('❌ Paymob authentication failed:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          fullError: error
        });
        return throwError(() => new Error('فشل الاتصال ببوابة الدفع'));
      })
    );
  }

  /**
   * Step 2: Create Order - Register the order with Paymob
   */
  private createOrder(authToken: string, amountCents: number, merchantOrderId: string, items: any[] = []): Observable<number> {
    const url = `${this.baseUrl}/ecommerce/orders`;
    const body = {
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: environment.paymob.currency,
      merchant_order_id: merchantOrderId,
      items: items.length > 0 ? items : [{
        name: 'Hotel Booking',
        amount_cents: amountCents,
        description: `Booking ${merchantOrderId}`,
        quantity: 1
      }]
    };

    console.log('📦 Paymob Create Order Request:', {
      url,
      amountCents,
      merchantOrderId,
      currency: environment.paymob.currency
    });

    return this.http.post<PaymobOrderResponse>(url, body).pipe(
      map(response => {
        console.log('✅ Paymob Order Created:', response);
        return response.id;
      }),
      catchError(error => {
        console.error('❌ Paymob order creation failed:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          fullError: error
        });
        return throwError(() => new Error('فشل إنشاء طلب الدفع'));
      })
    );
  }

  /**
   * Step 3: Get Payment Key - Generate payment token
   */
  private getPaymentKey(
    authToken: string,
    orderId: number,
    amountCents: number,
    billingData: PaymobBillingData
  ): Observable<string> {
    const url = `${this.baseUrl}/acceptance/payment_keys`;
    const body = {
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600, // 1 hour
      order_id: orderId,
      billing_data: billingData,
      currency: environment.paymob.currency,
      integration_id: this.integrationId
    };

    return this.http.post<PaymobPaymentKeyResponse>(url, body).pipe(
      map(response => response.token),
      catchError(error => {
        console.error('Paymob payment key generation failed:', error);
        return throwError(() => new Error('فشل إنشاء رمز الدفع'));
      })
    );
  }

  /**
   * Complete payment flow - Now calls backend instead of Paymob directly
   * @param amountInEGP - Amount in Egyptian Pounds (will be converted to cents)
   * @param merchantOrderId - Your booking reference number
   * @param billingData - Customer billing information
   * @returns Object with payment token, order ID, and payment URL
   */
  initiatePayment(
    amountInEGP: number,
    merchantOrderId: string,
    billingData: PaymobBillingData
  ): Observable<{ paymentToken: string; orderId: number; paymentUrl: string; integrationId?: number }> {
    console.log('💳 Initiating payment via backend:', { amountInEGP, merchantOrderId, billingData });

    const backendUrl = `${environment.server_urls[environment.active_server].baseApi}PublicBooking/initiate-payment`;
    
    const requestBody = {
      amount: amountInEGP,
      merchantOrderId: merchantOrderId,
      firstName: billingData.first_name,
      lastName: billingData.last_name,
      email: billingData.email,
      phoneNumber: billingData.phone_number,
      city: billingData.city,
      country: billingData.country
    };

    return this.http.post<any>(backendUrl, requestBody).pipe(
      map(response => {
        console.log('✅ Payment initiated successfully:', response);
        return {
          paymentToken: response.paymentToken,
          orderId: response.orderId,
          paymentUrl: response.paymentUrl,
          integrationId: response.integrationId
        };
      }),
      catchError(error => {
        console.error('❌ Payment initiation failed:', error);
        return throwError(() => new Error('فشل في تهيئة الدفع'));
      })
    );
  }

  /**
   * Get payment iframe URL
   */
  getPaymentIframeUrl(paymentToken: string): string {
    if (environment.paymob.iframeId) {
      return `https://accept.paymob.com/api/acceptance/iframes/${environment.paymob.iframeId}?payment_token=${paymentToken}`;
    }
    // Fallback to standard payment page
    return `https://accept.paymob.com/api/acceptance/payment_keys/${paymentToken}`;
  }

  /**
   * Verify transaction callback from Paymob
   * Important: This should also be verified on the backend for security
   */
  verifyCallback(callbackData: any): { success: boolean; transactionId?: string; error?: string } {
    try {
      // Check if payment was successful
      if (callbackData.success === 'true' || callbackData.success === true) {
        return {
          success: true,
          transactionId: callbackData.id || callbackData.txn_response_code
        };
      } else {
        return {
          success: false,
          error: callbackData.data?.message || 'فشلت عملية الدفع'
        };
      }
    } catch (error) {
      console.error('Error verifying Paymob callback:', error);
      return {
        success: false,
        error: 'خطأ في التحقق من عملية الدفع'
      };
    }
  }

  /**
   * Format billing data from booking form
   */
  formatBillingData(
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    countryCode: string = '+20'
  ): PaymobBillingData {
    return {
      apartment: 'NA',
      email: email,
      floor: 'NA',
      first_name: firstName,
      street: 'NA',
      building: 'NA',
      phone_number: `${countryCode}${phoneNumber}`.replace(/\+/g, ''),
      shipping_method: 'NA',
      postal_code: 'NA',
      city: 'Cairo',
      country: 'EG',
      last_name: lastName,
      state: 'Cairo'
    };
  }
}
