import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Servers } from 'src/app/enums/servers';
import { environment } from 'src/environments/environment';
import { PublicRoomTypeModel, PublicRoomTypeFiltersModel } from 'src/app/models/public-booking/public-room-type.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';

@Injectable({
  providedIn: 'root'
})
export class PublicRoomTypeService extends ServiceBase<PublicRoomTypeModel> {
  constructor(apiCaller: ApiCallerService, private httpClient: HttpClient) {
    super(apiCaller, "PublicRoomType", PublicRoomTypeModel, Servers.baseApi);
  }

  // Override create to handle PascalCase transformation
  override create(entity: PublicRoomTypeModel): Observable<PublicRoomTypeModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.body = this.toPascalCase(entity);
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return new this.entityConstructor(data);
      })
    );
  }

  // Override update to handle PascalCase transformation and correct endpoint
  override update(entity: PublicRoomTypeModel): Observable<PublicRoomTypeModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = `${this.endpoint}/${entity.id}`; // Add ID to URL
    request.body = this.toPascalCase(entity);
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return new this.entityConstructor(data);
      })
    );
  }

  // Override delete to add logging and proper response handling
  override delete(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => response)
    );
  }

  // Helper method to convert camelCase to PascalCase
  private toPascalCase(entity: PublicRoomTypeModel): any {
    const obj = entity.toJSON();
    const pascalObj: any = {};
    
    Object.keys(obj).forEach(key => {
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      pascalObj[pascalKey] = obj[key];
    });
    
    return pascalObj;
  }

  getByHotel(hotelId: string): Observable<PublicRoomTypeModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/hotel/${hotelId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicRoomTypeModel>) => item as PublicRoomTypeModel);
      })
    );
  }

  getPrice(roomTypeId: string, date: Date): Observable<number> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${roomTypeId}/price?date=${date.toISOString()}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as number;
      })
    );
  }

  getAvailability(roomTypeId: string, checkIn: Date, checkOut: Date): Observable<number> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${roomTypeId}/availability?checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as number;
      })
    );
  }

  getAllWithFilters(filters: PublicRoomTypeFiltersModel, page?: number, size?: number): Observable<PublicRoomTypeModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const params: string[] = [];
    if (filters.hotelId) params.push(`hotelId=${filters.hotelId}`);
    if (filters.name) params.push(`name=${encodeURIComponent(filters.name)}`);
    if (filters.minGuests) params.push(`minGuests=${filters.minGuests}`);
    if (filters.maxGuests) params.push(`maxGuests=${filters.maxGuests}`);
    if (filters.minPrice) params.push(`minPrice=${filters.minPrice}`);
    if (filters.maxPrice) params.push(`maxPrice=${filters.maxPrice}`);
    if (filters.isActive !== undefined) params.push(`isActive=${filters.isActive}`);
    if (page) params.push(`pageNumber=${page}`);
    if (size) params.push(`pageSize=${size}`);
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    request.endpoint = `${this.endpoint}${queryString}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicRoomTypeModel>) => item as PublicRoomTypeModel);
      })
    );
  }

  private get serverBaseUrl(): string {
    return (environment.server_urls as any)[environment.active_server as any][this.server_url as any];
  }

  uploadImages(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/${id}/upload-image`, formData, { withCredentials: true });
  }

  uploadAdditionalImages(id: string, files: FileList): Observable<any> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i], files[i].name);
    }
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/${id}/upload-images`, formData, { withCredentials: true });
  }

  uploadImagesTemp(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/upload-image-temp`, formData, { withCredentials: true });
  }

  uploadAdditionalImagesTemp(files: FileList): Observable<any> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i], files[i].name);
    }
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/upload-images-temp`, formData, { withCredentials: true });
  }

  deleteImage(id: string, publicId: string, isMain: boolean): Observable<any> {
    return this.httpClient.delete(`${this.serverBaseUrl}${this.endpoint}/${id}/delete-image`, {
      withCredentials: true,
      params: { publicId, isMain: String(isMain) }
    });
  }
}
