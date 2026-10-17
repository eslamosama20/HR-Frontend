import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Servers } from 'src/app/enums/servers';
import { environment } from 'src/environments/environment';
import { PublicHotelModel, PublicHotelFiltersModel } from 'src/app/models/public-booking/public-hotel.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';

@Injectable({
  providedIn: 'root'
})
export class PublicHotelService extends ServiceBase<PublicHotelModel> {
  constructor(apiCaller: ApiCallerService, private httpClient: HttpClient) {
    super(apiCaller, "PublicHotel", PublicHotelModel, Servers.baseApi);
  }

  // Override create to handle PascalCase transformation
  override create(entity: PublicHotelModel): Observable<PublicHotelModel> {
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
  override update(entity: PublicHotelModel): Observable<PublicHotelModel> {
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

  private toPascalCase(entity: PublicHotelModel): any {
    const obj = entity.toJSON();
    const pascalObj: any = {};
    Object.keys(obj).forEach(key => {
      pascalObj[key.charAt(0).toUpperCase() + key.slice(1)] = obj[key];
    });
    return pascalObj;
  }

  getFeatured(): Observable<PublicHotelModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/featured`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicHotelModel>) => item as PublicHotelModel);
      })
    );
  }

  search(
    searchTerm?: string,
    checkIn?: Date,
    checkOut?: Date,
    guests?: number
  ): Observable<PublicHotelModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const params: string[] = [];
    if (searchTerm) params.push(`searchTerm=${encodeURIComponent(searchTerm)}`);
    if (checkIn) params.push(`checkIn=${checkIn.toISOString()}`);
    if (checkOut) params.push(`checkOut=${checkOut.toISOString()}`);
    if (guests) params.push(`guests=${guests}`);
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    request.endpoint = `${this.endpoint}/search${queryString}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicHotelModel>) => item as PublicHotelModel);
      })
    );
  }

  getAllWithFilters(filters: PublicHotelFiltersModel, page?: number, size?: number): Observable<PublicHotelModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const params: string[] = [];
    if (filters.name) params.push(`name=${encodeURIComponent(filters.name)}`);
    if (filters.city) params.push(`city=${encodeURIComponent(filters.city)}`);
    if (filters.country) params.push(`country=${encodeURIComponent(filters.country)}`);
    if (filters.minStars) params.push(`minStars=${filters.minStars}`);
    if (filters.maxStars) params.push(`maxStars=${filters.maxStars}`);
    if (filters.isActive !== undefined) params.push(`isActive=${filters.isActive}`);
    if (filters.isFeatured !== undefined) params.push(`isFeatured=${filters.isFeatured}`);
    if (page) params.push(`pageNumber=${page}`);
    if (size) params.push(`pageSize=${size}`);
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    request.endpoint = `${this.endpoint}${queryString}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicHotelModel>) => item as PublicHotelModel);
      })
    );
  }

  private get serverBaseUrl(): string {
    return (environment.server_urls as any)[environment.active_server as any][this.server_url as any];
  }

  uploadMainImage(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/${id}/upload-main-image`, formData, { withCredentials: true });
  }

  uploadAdditionalImages(id: string, files: FileList): Observable<any> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i], files[i].name);
    }
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/${id}/upload-additional-images`, formData, { withCredentials: true });
  }

  uploadMainImageTemp(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/upload-main-image-temp`, formData, { withCredentials: true });
  }

  uploadAdditionalImagesTemp(files: FileList): Observable<any> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i], files[i].name);
    }
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/upload-additional-images-temp`, formData, { withCredentials: true });
  }

  deleteImage(id: string, publicId: string, isMain: boolean): Observable<any> {
    return this.httpClient.delete(`${this.serverBaseUrl}${this.endpoint}/${id}/delete-image`, {
      withCredentials: true,
      params: { publicId, isMain: String(isMain) }
    });
  }
}
