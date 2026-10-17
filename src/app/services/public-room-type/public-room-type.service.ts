import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { Servers } from 'src/app/enums/servers';
import { PublicRoomTypeModel, RoomAvailability } from 'src/app/models/public-hotel/public-hotel.model';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';

@Injectable({
  providedIn: 'root'
})
export class PublicRoomTypeService {
  private endpoint = 'PublicRoomType';
  private server_url = Servers.baseApi;

  constructor(private apiCaller: ApiCallerService, private httpClient: HttpClient) {}

  getAll(): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  getHotelRooms(hotelId: string): Observable<PublicRoomTypeModel[]> {
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

  checkAvailability(
    roomTypeId: string,
    checkInDate: Date,
    checkOutDate: Date,
    quantity: number = 1
  ): Observable<RoomAvailability> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${roomTypeId}/availability?checkInDate=${checkInDate.toISOString()}&checkOutDate=${checkOutDate.toISOString()}&quantity=${quantity}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return data as RoomAvailability;
      })
    );
  }

  getByHotel(hotelId: string): Observable<any> {
    return this.getHotelRooms(hotelId);
  }

  linkToErpRoomType(publicRoomTypeId: string, erpRoomTypeId: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${publicRoomTypeId}/link-erp/${erpRoomTypeId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
  }

  unlinkFromErpRoomType(publicRoomTypeId: string): Observable<any> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/${publicRoomTypeId}/unlink-erp`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request);
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
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/${id}/upload-additional-images`, formData, { withCredentials: true });
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
    return this.httpClient.post(`${this.serverBaseUrl}${this.endpoint}/upload-additional-images-temp`, formData, { withCredentials: true });
  }

  deleteImage(id: string, publicId: string, isMain: boolean): Observable<any> {
    return this.httpClient.delete(`${this.serverBaseUrl}${this.endpoint}/${id}/delete-image`, {
      withCredentials: true,
      params: { publicId, isMain: String(isMain) }
    });
  }
}
