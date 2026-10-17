import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { RoomTypeModel } from 'src/app/models/accounting/room-type-model';
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
export class RoomTypeService extends ServiceBase<RoomTypeModel> {
  private readonly baseApi = environment.server_urls[environment.active_server][Servers.baseApi];
  private readonly listFields: string[] = [
    'id',
    'isActive',
    'arabicName',
    'englishName',
    'personNo',
    'createdAt',
    'isFrontal',
    'logoUrl',
    'logoPublicId',
    'imageUrls'
  ];

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "roomType", RoomTypeModel, Servers.baseApi);
  }

  override getAll(page: number = null, size: number = null): Observable<RoomTypeModel[]> {
    return super.getAll(page, size, this.listFields);
  }

  getAllFrontal(page: number = null, size: number = null): Observable<RoomTypeModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<RoomTypeModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(roomTypeId: string): Observable<RoomTypeModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${roomTypeId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  uploadLogo(roomTypeId: string, file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('roomTypeId', roomTypeId);
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}roomType/upload-logo`, formData);
  }

  uploadLogoTemp(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}roomType/upload-logo-temp`, formData);
  }

  uploadImages(roomTypeId: string, files: File[]): Observable<{ imageUrls: string[] }> {
    const formData = new FormData();
    formData.append('roomTypeId', roomTypeId);
    files.forEach((file) => formData.append('files', file, file.name));
    return this.http.post<{ imageUrls: string[] }>(`${this.baseApi}roomType/upload-images`, formData);
  }

  uploadImagesTemp(files: File[]): Observable<{ imageUrls: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));
    return this.http.post<{ imageUrls: string[] }>(`${this.baseApi}roomType/upload-images-temp`, formData);
  }
}
