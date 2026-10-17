import {Injectable} from '@angular/core';
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {AttachmentModel} from "../../models/Attachments/attachment.model";
import {HttpClient} from '@angular/common/http';
import {environment} from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttachmentService  {

  endpoint: string = 'attachments';
  server_url: Servers = Servers.baseApi;
  constructor(
    protected apiCaller: ApiCallerService,
    private http: HttpClient
  ) {
  }

  getAllNoneReferenced(page: number = null, size: number = null): Observable<AttachmentModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/noneReferenced?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + "/noneReferenced";
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<AttachmentModel>) => new AttachmentModel(item)))
    );
  }

  getAll(page: number = null, size: number = null): Observable<AttachmentModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint;
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<AttachmentModel>) => new AttachmentModel(item)))
    );
  }

  getById(id: string,): Observable<AttachmentModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new AttachmentModel(data))
    );
  }

  downloadAttachment(id: string,): Observable<AttachmentModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/download/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new AttachmentModel(data))
    );
  }

  downloadFile(id: string): Observable<Blob> {
    const url = `${environment.server_urls[environment.active_server][this.server_url]}${this.endpoint}/download-file/${id}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  uploadFile(file: File, orderId?: string, accountingOrderId?: string, paymentReceiptId?: string, paycheckReceiptId?: string): Observable<AttachmentModel> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (orderId) {
      formData.append('orderId', orderId);
    }
    if (accountingOrderId) {
      formData.append('accountingOrderId', accountingOrderId);
    }
    if (paymentReceiptId) {
      formData.append('paymentReceiptId', paymentReceiptId);
    }
    if (paycheckReceiptId) {
      formData.append('paycheckReceiptId', paycheckReceiptId);
    }
    const url = `${environment.server_urls[environment.active_server][this.server_url]}${this.endpoint}/upload`;
    return this.http.post(url, formData).pipe(map(data => new AttachmentModel(data)));
  }

  updateFile(id: string, file: File): Observable<AttachmentModel> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const url = `${environment.server_urls[environment.active_server][this.server_url]}${this.endpoint}/upload/${id}`;
    return this.http.put(url, formData).pipe(map(data => new AttachmentModel(data)));
  }

  create(entity: AttachmentModel): Observable<AttachmentModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.body = entity;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new AttachmentModel(data))
    );
  }

  update(entity: AttachmentModel,): Observable<AttachmentModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = `${this.endpoint}`;
    request.body = entity;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new AttachmentModel(data))
    );
  }

  delete(id: string,): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(() => null)
    );
  }
}
