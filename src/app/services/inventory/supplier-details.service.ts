import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {SupplierDetailsModel} from "../../models/inventory/supplierDetails.model";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";
import {environment} from "src/environments/environment";

export interface SupplierDetailsImportFailure {
  row: number;
  name: string;
  reason: string;
  errorCode?: string;
}

export interface SupplierDetailsImportResult {
  imported: number;
  updated:  number;
  failed:   SupplierDetailsImportFailure[];
}

@Injectable({
  providedIn: 'root'
})
export class SupplierDetailsService extends ServiceBase<SupplierDetailsModel> {
  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "supplierDetails", SupplierDetailsModel, Servers.inventoryUrl);
  }

  deleteMultiple(ids: string[]): Observable<void> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.inventoryUrl];
    const url = `${baseUrl}SupplierDetails/delete-range`;
    return this.http.delete<void>(url, {
      headers: {
        'Content-Type': 'application/json',
        'h-n': window.location.hostname,
      },
      body: ids,
    });
  }

  getAllFrontal(page: number = null, size: number = null): Observable<SupplierDetailsModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<SupplierDetailsModel>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(customerProfileId: string): Observable<SupplierDetailsModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${customerProfileId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  quickAdd(dto: { arabicName: string; taxNumber?: string }): Observable<SupplierDetailsModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.server_url = this.server_url;
    request.body = dto;
    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  importFromExcel(file: File): Observable<SupplierDetailsImportResult> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.inventoryUrl];
    const url = `${baseUrl}SupplierDetails/import`;
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<SupplierDetailsImportResult>(url, formData);
  }

  downloadTemplate(): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.inventoryUrl];
    const url = `${baseUrl}SupplierDetails/template`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
