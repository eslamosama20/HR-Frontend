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
export abstract class InventoryServiceBaseService<T extends EntityBase> {
  constructor(
    protected apiCaller: ApiCallerService,
    protected endpoint: string,
    protected entityConstructor: new (data?: Partial<T>) => T,
    protected server_url: Servers
  ) {
  }

  getAll(page: number = null, size: number = null,productDetailsId : string = null): Observable<OperationResponseModel<T[]>> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;

    const queryParams: string[] = [];
    if (page !== null && size !== null) {
      queryParams.push(`pageNumber=${page}`, `pageSize=${size}`);
    }
    if (productDetailsId !== null) {
      queryParams.push(`productDetailsId=${productDetailsId}`);
    }
    const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';

    request.endpoint = `${this.endpoint}${queryString}`;

    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(res => new OperationResponseModel(
        res.data ?
          res.data.map((item: Partial<T>) => new this.entityConstructor(item))
          : [],
        res?.totalCount ?? 0,res?.isPaginated ?? false))
    );
  }

  getById(id: string,): Observable<T> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${id}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  create(entity: T ,): Observable<T> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = this.endpoint;
    request.body = entity.toJSON();
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  update(entity: T,): Observable<T> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = `${this.endpoint}`;
    request.body = entity.toJSON();
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
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
