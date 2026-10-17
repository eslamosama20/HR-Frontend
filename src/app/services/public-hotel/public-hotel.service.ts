import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Servers } from 'src/app/enums/servers';
import { environment } from 'src/environments/environment';
import { PublicHotelModel, HotelSearchFilters } from 'src/app/models/public-hotel/public-hotel.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';

@Injectable({
  providedIn: 'root'
})
export class PublicHotelService {
  private endpoint = 'PublicHotel';
  private server_url = Servers.baseApi;

  constructor(private apiCaller: ApiCallerService, private httpClient: HttpClient) {}

  getAll(): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  getById(id: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  // Alias for compatibility
  get(id: string): Observable<any> {
    return this.getById(id);
  }

  searchHotels(filters: HotelSearchFilters): Observable<PublicHotelModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const params: string[] = [];
    if (filters.city) params.push(`city=${encodeURIComponent(filters.city)}`);
    if (filters.checkInDate) params.push(`checkInDate=${filters.checkInDate.toISOString()}`);
    if (filters.checkOutDate) params.push(`checkOutDate=${filters.checkOutDate.toISOString()}`);
    if (filters.numberOfGuests) params.push(`numberOfGuests=${filters.numberOfGuests}`);
    if (filters.numberOfRooms) params.push(`numberOfRooms=${filters.numberOfRooms}`);
    if (filters.minPrice) params.push(`minPrice=${filters.minPrice}`);
    if (filters.maxPrice) params.push(`maxPrice=${filters.maxPrice}`);
    if (filters.stars) params.push(`stars=${filters.stars}`);
    if (filters.sortBy) params.push(`sortBy=${filters.sortBy}`);
    if (filters.sortOrder) params.push(`sortOrder=${filters.sortOrder}`);
    
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

  getFeaturedHotels(limit: number = 6): Observable<PublicHotelModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/featured?limit=${limit}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<PublicHotelModel>) => item as PublicHotelModel);
      })
    );
  }

  getHotelWithRooms(hotelId: string): Observable<PublicHotelModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${hotelId}/with-rooms`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as PublicHotelModel;
      })
    );
  }

  linkToErpHotel(publicHotelId: string, erpHotelId: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${publicHotelId}/link-erp/${erpHotelId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  unlinkFromErpHotel(publicHotelId: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${publicHotelId}/unlink-erp`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
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
