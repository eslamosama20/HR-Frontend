import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {EntityBase} from '../../models/base/entity-base';
import {ApiCallerService, APIRequest, HTTPVerbs} from '../api-caller.service';
import { Servers } from 'src/app/enums/servers';
import {OperationResponseModel} from "../../models/operationResponse.model";

@Injectable({
  providedIn: 'root',
})
export abstract class ServiceBase<T extends EntityBase> {
  constructor(
    protected apiCaller: ApiCallerService,
    protected endpoint: string,
    protected entityConstructor: new (data?: Partial<T>) => T,
    protected server_url: Servers
  ) {
  }

  getAll(page: number = null, size: number = null, fields: string[] = null, includeDeleted: boolean = false): Observable<T[]> {
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
        // Handle OperationResponse wrapper from backend (support both direct array and paginated { totalRecords, data })
        const raw = res?.data ?? res ?? [];
        const list = Array.isArray(raw)
          ? raw
          : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.$values) ? raw.$values : []));
        return list.map((item: Partial<T>) => new this.entityConstructor(item));
      })
    );
  }

  searchPaged(q: string, page: number = 1, size: number = 20, sortField?: string, sortOrder?: number): Observable<{ data: T[], totalCount: number }> {
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

    request.endpoint = `${this.endpoint}/search?${queryParts.join('&')}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        const items = list.map((item: Partial<T>) => new this.entityConstructor(item));
        const totalCount = res?.totalCount ?? list.length;
        return { data: items, totalCount };
      })
    );
  }

  getPaged(page: number, size: number, fields: string[] = null, includeDeleted: boolean = false): Observable<{ data: T[], totalCount: number }> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;

    const queryParts: string[] = [];
    queryParts.push(`pageNumber=${page}`, `pageSize=${size}`);
    if (fields?.length) {
      queryParts.push(`fields=${encodeURIComponent(fields.join(','))}`);
    }
    if (includeDeleted) {
      queryParts.push(`includeDeleted=true`);
    }

    request.endpoint = `${this.endpoint}?${queryParts.join('&')}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        const items = list.map((item: Partial<T>) => new this.entityConstructor(item));
        const totalCount = res?.totalCount ?? list.length;
        return { data: items, totalCount };
      })
    );
  }
  
  getById(id: string,): Observable<T> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return new this.entityConstructor(data);
      })
    );
  }

  create(entity: T ,): Observable<T> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.body = entity.toJSON();
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return new this.entityConstructor(data);
      })
    );
  }

  createRange(entities: T[]): Observable<T[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint + '/range';
    request.body = entities.map(entity => entity.toJSON());
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response ?? [];
        return (Array.isArray(data) ? data : []).map((item: Partial<T>) => new this.entityConstructor(item));
      })
    );
  }

  update(entity: T,): Observable<T> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = `${this.endpoint}`;
    request.body = entity.toJSON();
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(response => {
        const data = response?.data ?? response;
        return new this.entityConstructor(data);
      })
    );
  }

  delete(id: string,): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((response) => {
        // Handle 204 No Content or any other successful response
        return undefined;
      })
    );
  }

  deleteMultiple(ids: string[]): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/bulk`;
    request.body = ids;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map((response) => {
        return undefined;
      })
    );
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Add leading zero
    const day = ('0' + date.getDate()).slice(-2); // Add leading zero
    return `${year}-${month}-${day}`;
  }
}
