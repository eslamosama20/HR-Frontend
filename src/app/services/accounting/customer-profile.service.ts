import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";
import {environment} from "src/environments/environment";

export interface CustomerProfileImportFailure {
  row: number;
  name: string;
  reason: string;
  errorCode?: string;
}

export interface CustomerProfileImportResult {
  imported: number;
  updated:  number;
  failed:   CustomerProfileImportFailure[];
}

@Injectable({
  providedIn: 'root'
})
export class CustomerProfileService extends ServiceBase<CustomerProfileModel> {
  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "customerProfile", CustomerProfileModel, Servers.accountingUrl);
  }

  deleteMultiple(ids: string[]): Observable<void> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}customerProfile/delete-range`;
    return this.http.delete<void>(url, {
      headers: {
        'Content-Type': 'application/json',
        'h-n': window.location.hostname,
      },
      body: ids,
    });
  }

  getAllFrontal(page: number = null, size: number = null): Observable<CustomerProfileModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<CustomerProfileModel>) => new this.entityConstructor(item)))
    );
  }

  getReservationCompanies(): Observable<CustomerProfileModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = this.endpoint + '?IsReservationCompany=true&pageNumber=1&pageSize=1000000';
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data?.data ?? data ?? []).map((item: Partial<CustomerProfileModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(customerProfileId: string): Observable<CustomerProfileModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${customerProfileId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  quickAdd(dto: { arabicName: string; taxNumber?: string; contactNumber?: string }): Observable<CustomerProfileModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = this.server_url;
    request.body = dto;
    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  /**
   * Upload a raw .xlsx file to the dedicated server-side import endpoint.
   * The server parses Excel, performs a bulk upsert in a single transaction,
   * and returns structured counts + per-row failures.
   * No client-side Excel parsing or looping needed.
   */
  importFromExcel(file: File): Observable<CustomerProfileImportResult> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}customerProfile/import`;
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<CustomerProfileImportResult>(url, formData);
  }

  downloadTemplate(): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}customerProfile/template`;
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Server-side search with support for isReservationCompany filter.
   * Calls the base searchPaged and appends IsReservationCompany query param when provided.
   */
  searchPagedWithCompanyFilter(
    q: string,
    page: number = 1,
    size: number = 20,
    sortField?: string,
    sortOrder?: number,
    isReservationCompany?: boolean | null
  ): Observable<{ data: CustomerProfileModel[], totalCount: number }> {
    // Build the search URL manually to append IsReservationCompany
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    const queryParts: string[] = [];
    
    if (q) {
      queryParts.push(`q=${encodeURIComponent(q)}`);
    }
    queryParts.push(`pageNumber=${page}`, `pageSize=${size}`);
    if (sortField) {
      queryParts.push(`sortField=${encodeURIComponent(sortField)}`);
    }
    if (sortOrder !== undefined && sortOrder !== null) {
      queryParts.push(`sortOrder=${sortOrder}`);
    }
    if (isReservationCompany !== null && isReservationCompany !== undefined) {
      queryParts.push(`IsReservationCompany=${isReservationCompany}`);
    }

    request.endpoint = `${this.endpoint}/search?${queryParts.join('&')}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const rawData = res?.data;
        const list = Array.isArray(rawData) 
          ? rawData 
          : (Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(res) ? res : []));
        const items = list.map((item: any) => new this.entityConstructor(item));
        const totalCount = rawData?.totalCount ?? res?.totalCount ?? list.length;
        return { data: items, totalCount };
      })
    );
  }
}
