import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { HotelModel } from 'src/app/models/accounting/hotel-model';
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
export class HotelService extends ServiceBase<HotelModel> {
  private readonly baseUrl: string;
  private readonly listFields: string[] = [
    'id',
    'isActive',
    'arabicName',
    'englishName',
    'mainAccountId',
    'createdAt',
    'isFrontal',
    'logoUrl',
    'logoPublicId',
    'contactNumber',
    'email',
    'bankName',
    'bankAccountNumber',
    'iban',
    'taxNumber',
    'street',
    'district',
    'city',
    'country',
    'shortAddress',
    'buildingNumber',
    'postalCode',
    'website',
    'additionalContactNumber',
    'fax',
    'gaztNumber'
  ];

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "hotel", HotelModel, Servers.baseApi);
    this.baseUrl = environment.server_urls[environment.active_server][Servers.baseApi];
  }

  override getAll(page: number = null, size: number = null): Observable<HotelModel[]> {
    return super.getAll(page, size, this.listFields);
  }

  override searchPaged(q: string, page: number = 1, size: number = 20, sortField?: string, sortOrder?: number): Observable<{ data: HotelModel[], totalCount: number }> {
    return super.searchPaged(q, page, size, sortField, sortOrder);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<HotelModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<HotelModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(hotelId: string): Observable<HotelModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${hotelId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  importFromExcel(file: File): Observable<{ imported: number; updated: number; failed: { row: number; name: string; reason: string }[] }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const url = `${this.baseUrl}${this.endpoint}/import`;
    return this.http.post<{ imported: number; updated: number; failed: { row: number; name: string; reason: string }[] }>(
      url, formData, { headers: { 'h-n': window.location.hostname } }
    );
  }

  downloadTemplate(): Observable<Blob> {
    const url = `${this.baseUrl}${this.endpoint}/template`;
    return this.http.get(url, {
      responseType: 'blob',
      headers: { 'h-n': window.location.hostname }
    });
  }

  uploadLogo(hotelId: string, file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('hotelId', hotelId);
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseUrl}hotel/upload-logo`, formData, {
      headers: { 'h-n': window.location.hostname }
    });
  }

  uploadLogoTemp(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseUrl}hotel/upload-logo-temp`, formData, {
      headers: { 'h-n': window.location.hostname }
    });
  }
}
