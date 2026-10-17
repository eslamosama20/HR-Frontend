import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BillOfSaleResponseDto, BillOfSalePostDto, BillOfSalePutDto } from 'src/app/models/billsOfSales/billsOfSales';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BillsOfSalesService {
  private baseUrl = environment.server_urls[environment.active_server].billsOfSalesUrl;

  constructor(private http: HttpClient) {}

  // Get all bills of sale
  getAllBills(): Observable<BillOfSaleResponseDto[]> {
    return this.http.get<BillOfSaleResponseDto[]>(this.baseUrl);
  }

  // Get a specific bill of sale by id
  getBillById(id: string): Observable<BillOfSaleResponseDto> {
    return this.http.get<BillOfSaleResponseDto>(`${this.baseUrl}/${id}`);
  }

  // Create a new bill of sale
  createBillOfSale(billOfSale: BillOfSalePostDto): Observable<any> {
    return this.http.post<any>(this.baseUrl, billOfSale, this.httpOptions());
  }

  // Update an existing bill of sale
  updateBillOfSale(id: string, billOfSale: BillOfSalePutDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, billOfSale, this.httpOptions());
  }

  // Delete a bill of sale by id
  deleteBillOfSale(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  // Get a new bill number
  getNewBillNumber(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/billNo`);
  }

  // Helper method to build HTTP options with headers
  private httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
  }
}
