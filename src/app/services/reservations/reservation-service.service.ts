import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ReservationServiceModel } from 'src/app/models/accounting/reservation-service-model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface UploadResponse {
  url: string;
  publicId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationServiceService  extends ServiceBase<ReservationServiceModel> {
  private readonly baseApi = environment.server_urls[environment.active_server][Servers.baseApi];
  private readonly listFields: string[] = [
    'id',
    'isActive',
    'arabicName',
    'englishName',
    'revenueMainAccountId',
    'expenseMainAccountId',
    'createdAt',
    'isFrontal',
    'logoUrl',
    'logoPublicId',
    'contactNumber',
    'email',
    'bankName',
    'bankAccountNumber',
    'iban',
    'taxNumber'
  ];

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "reservationService", ReservationServiceModel, Servers.baseApi);
  }

  override getAll(page: number = null, size: number = null): Observable<ReservationServiceModel[]> {
    return super.getAll(page, size, this.listFields);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<ReservationServiceModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<ReservationServiceModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(reservationServiceId: string): Observable<ReservationServiceModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${reservationServiceId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  uploadLogo(reservationServiceId: string, file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('reservationServiceId', reservationServiceId);
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}reservationService/upload-logo`, formData);
  }

  uploadLogoTemp(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}reservationService/upload-logo-temp`, formData);
  }
}
