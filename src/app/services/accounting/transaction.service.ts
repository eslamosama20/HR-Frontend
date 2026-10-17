import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {TransactionModel} from "../../models/accounting/transaction.model";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TransactionImportFailure {
  row: number;
  name: string;
  reason: string;
  errorCode?: string;
  values?: string[];
}

export interface TransactionImportResult {
  imported: number;
  updated: number;
  headers?: string[];
  failed: TransactionImportFailure[];
}

export interface TransactionBulkDeleteFailure {
  id: string;
  referenceNumber: string;
  reasonCode: string;
  reason: string;
  reasonAr: string;
}

export interface TransactionBulkDeleteResult {
  requested: number;
  deleted: number;
  failed: TransactionBulkDeleteFailure[];
}

export interface TransactionFilterParams {
  searchKeyword?: string;
  referenceNumber?: string;
  description?: string;
  transactionTypeId?: string;
  fromTransactionDate?: string;
  toTransactionDate?: string;
  transactionDate?: string;
  fromCreatedAt?: string;
  toCreatedAt?: string;
  isActive?: boolean;
  sortField?: string;
  sortOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService extends ServiceBase<TransactionModel> {
  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "transaction", TransactionModel, Servers.accountingUrl);
  }

  getAll(page: number = null, size: number = null, fields: string[] = null, includeDeleted: boolean = false): Observable<TransactionModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;

    const queryParts: string[] = [];
    if (page && size) {
      queryParts.push(`pageNumber=${page}`, `pageSize=${size}`);
    }
    if (fields?.length) {
      queryParts.push(`fields=${encodeURIComponent(fields.join(','))}`);
    }
    if (includeDeleted) {
      queryParts.push(`includeDeleted=true`);
    }

    request.endpoint = queryParts.length > 0
      ? `${this.endpoint}?${queryParts.join('&')}`
      : this.endpoint;
  
    request.server_url = this.server_url;
  
    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        return list.map((item: Partial<TransactionModel>) => new this.entityConstructor(item));
      })
    );
  }

  getAllFrontal(page: number = null, size: number = null, includeDeleted: boolean = false): Observable<TransactionModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const queryParts: string[] = [];
    if (page && size) {
      queryParts.push(`pageNumber=${page}`, `pageSize=${size}`);
    }
    if (includeDeleted) {
      queryParts.push(`includeDeleted=true`);
    }
    
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    request.endpoint = `${this.endpoint}/frontal${queryString}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<TransactionModel>) => new this.entityConstructor(item)))
    );
  }

  getTransactionsPaged(
    page: number = 1,
    size: number = 10,
    filters?: TransactionFilterParams | string,
    includeDeleted: boolean = false,
    sortField?: string,
    sortOrder?: number
  ): Observable<{ data: TransactionModel[]; totalCount: number }> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;

    const queryParts: string[] = [];
    queryParts.push(`pageNumber=${page}`, `pageSize=${size}`);
    if (includeDeleted) {
      queryParts.push(`includeDeleted=true`);
    }

    let filterObj: TransactionFilterParams = {};
    if (typeof filters === 'string') {
      filterObj = { searchKeyword: filters };
    } else if (filters && typeof filters === 'object') {
      filterObj = { ...filters };
    }
    if (sortField) filterObj.sortField = sortField;
    if (sortOrder !== undefined && sortOrder !== null) filterObj.sortOrder = sortOrder;

    for (const [key, value] of Object.entries(filterObj)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value).trim())}`);
      }
    }

    request.endpoint = `${this.endpoint}?${queryParts.join('&')}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        const items = list.map((item: Partial<TransactionModel>) => new this.entityConstructor(item));
        const totalCount = res?.totalCount ?? list.length;
        return { data: items, totalCount };
      })
    );
  }

  getAllFrontalPaged(
    page: number = null,
    size: number = null,
    includeDeleted: boolean = false,
    filters?: TransactionFilterParams | string,
    sortField?: string,
    sortOrder?: number
  ): Observable<{ data: TransactionModel[]; totalCount: number }> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    
    const queryParts: string[] = [];
    if (page && size) {
      queryParts.push(`pageNumber=${page}`, `pageSize=${size}`);
    }
    if (includeDeleted) {
      queryParts.push(`includeDeleted=true`);
    }

    let filterObj: TransactionFilterParams = {};
    if (typeof filters === 'string') {
      filterObj = { searchKeyword: filters };
    } else if (filters && typeof filters === 'object') {
      filterObj = { ...filters };
    }
    if (sortField) filterObj.sortField = sortField;
    if (sortOrder !== undefined && sortOrder !== null) filterObj.sortOrder = sortOrder;

    for (const [key, value] of Object.entries(filterObj)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value).trim())}`);
      }
    }
    
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    request.endpoint = `${this.endpoint}/frontal${queryString}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        const items = list.map((item: Partial<TransactionModel>) => new this.entityConstructor(item));
        const totalCount = res?.totalCount ?? list.length;
        return { data: items, totalCount };
      })
    );
  }

  makeFrontal(transactionId: string): Observable<TransactionModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${transactionId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  downloadTemplate(): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}transaction/template`;
    return this.http.get(url, { responseType: 'blob' });
  }

  importFromExcel(file: File): Observable<TransactionImportResult> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}transaction/import`;
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<TransactionImportResult>(url, formData);
  }

  bulkDelete(ids: string[]): Observable<TransactionBulkDeleteResult> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}transaction/bulk-delete`;
    return this.http.post<TransactionBulkDeleteResult>(url, { ids });
  }

  restore(id: string): Observable<TransactionModel> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.accountingUrl];
    const url = `${baseUrl}transaction/${id}/restore`;
    return this.http.post<TransactionModel>(url, {});
  }
}
