import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QrcodeService {
  private baseUrl = environment.server_urls[environment.active_server].invoiceUrl + 'api/QRs/qrcode';
  constructor(private http: HttpClient) { }

  generateQRCode(url: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${encodeURIComponent(url)}`, {
      responseType: 'blob'
    });
  }
}
