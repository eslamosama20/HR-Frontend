import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export enum ReportType {
  InventoryReport = 'inventoryReport',
  SupplierReport ='supplierReport'

}

@Injectable({
  providedIn: 'root'
})

export class ReportServiceService {

  private apiUrl = environment.server_urls[environment.active_server].reportUrl  + 'Report';

  constructor(private http:HttpClient) { }

  // Method to generate a report URL
  generateReportUrl(reportType: ReportType, parameters: any): Observable<{ ReportUrl: string }> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = JSON.stringify(parameters);
    const url = `${this.apiUrl}/generate-url?reportType=${reportType}`;

    return this.http.post<{ ReportUrl: string }>(url, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Method to handle errors from the HTTP call
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
    }
    // Return an observable with a user-facing error message.
    return throwError('Something bad happened; please try again later.');
  }
}
