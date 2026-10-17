import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SalesReturn } from 'src/app/models/salesReturn/salesReturn';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SalesReturnService {
  private baseUrl = environment.server_urls[environment.active_server].baseApi+'salesReturn';
  private salesReturnNoUrl = this.baseUrl + 'ReturnNo';




  constructor(private http: HttpClient) { }

  getAllReturns(): Observable<SalesReturn[]> {
    return this.http.get<SalesReturn[]>(this.baseUrl);
  }

  getReturnById(id: number): Observable<SalesReturn> {
    return this.http.get<SalesReturn>(`${this.baseUrl}/${id}`);
  }

  createReturn(salesReturn: SalesReturn): Observable<any> {
    return this.http.post(`${this.baseUrl}`, salesReturn, this.getHttpOptions());
  }

  createReturnTransaction(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/createTransaction?salesReturnId=${id}`,null ,this.getHttpOptions());
  }

  // Update an salesReturn by ID
  updateReturn(id: number, salesReturn: SalesReturn): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, salesReturn, this.getHttpOptions());
  }

  // Delete an salesReturn by ID
  deleteReturn(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // Get a new salesReturn number
  getReturnNumber(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ReturnNo`);
  }

  // HTTP options with headers
  private getHttpOptions() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return httpOptions;
  }
}
