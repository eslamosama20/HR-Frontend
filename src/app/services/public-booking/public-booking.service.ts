import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Servers } from 'src/app/enums/servers';
import { PublicBookingModel, PublicBookingFiltersModel, BookingStatus, PaymentStatus } from 'src/app/models/public-booking/public-booking.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';

@Injectable({
  providedIn: 'root'
})
export class PublicBookingService extends ServiceBase<PublicBookingModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "PublicBooking", PublicBookingModel, Servers.baseApi);
  }

  getByReference(reference: string): Observable<PublicBookingModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/reference/${reference}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as PublicBookingModel;
      })
    );
  }

  confirmBooking(bookingId: string): Observable<PublicBookingModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${bookingId}/confirm`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as PublicBookingModel;
      })
    );
  }

  cancelBooking(bookingId: string, reason: string): Observable<PublicBookingModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${bookingId}/cancel`;
    request.server_url = this.server_url;
    request.body = { reason };

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as PublicBookingModel;
      })
    );
  }

  updatePayment(bookingId: string, paymentData: { paymentStatus: PaymentStatus, transactionId?: string, paymobOrderId?: number }): Observable<PublicBookingModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${bookingId}/payment`;
    request.server_url = this.server_url;
    request.body = paymentData;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as PublicBookingModel;
      })
    );
  }

  getAllWithFilters(filters: PublicBookingFiltersModel, page?: number, size?: number): Observable<PublicBookingModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const params: string[] = [];
    if (filters.hotelId) params.push(`hotelId=${filters.hotelId}`);
    if (filters.bookingReference) params.push(`bookingReference=${encodeURIComponent(filters.bookingReference)}`);
    if (filters.guestName) params.push(`guestName=${encodeURIComponent(filters.guestName)}`);
    if (filters.guestEmail) params.push(`guestEmail=${encodeURIComponent(filters.guestEmail)}`);
    if (filters.status !== undefined) params.push(`status=${filters.status}`);
    if (filters.paymentStatus !== undefined) params.push(`paymentStatus=${filters.paymentStatus}`);
    if (page) params.push(`pageNumber=${page}`);
    if (size) params.push(`pageSize=${size}`);
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    request.endpoint = `${this.endpoint}${queryString}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicBookingModel>) => item as PublicBookingModel);
      })
    );
  }

  // Alias for compatibility
  add(booking: PublicBookingModel): Observable<PublicBookingModel> {
    return this.create(booking);
  }
}
