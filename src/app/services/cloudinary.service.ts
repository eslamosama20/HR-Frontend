import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Servers } from '../enums/servers';

export interface CloudinaryUploadResponse {
  url: string;
  publicId: string;
}

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly baseApi = environment.server_urls[environment.active_server][Servers.baseApi];
  private readonly companyUploadLogoUrl = `${this.baseApi}company/upload-logo`;

  constructor(private readonly http: HttpClient) {}

  uploadCompanyLogo(file: File): Observable<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<CloudinaryUploadResponse>(this.companyUploadLogoUrl, formData);
  }

  getCloudinaryCloudName(): string {
    return environment.cloudinary.cloudName;
  }

  getThumbnailUrl(url: string, width: number = 200, height: number = 200): string {
    if (!url) {
      return '';
    }

    const uploadMarker = '/upload/';
    if (!url.includes(uploadMarker)) {
      return url;
    }

    const transformation = `w_${width},h_${height},c_fill`;
    return url.replace(uploadMarker, `${uploadMarker}${transformation}/`);
  }
}
