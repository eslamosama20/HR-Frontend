import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import {BatchDetailsModel} from "../../models/inventory/batchDetails.model";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {ProductBatchToUnitAssignments} from "../../models/inventory/productBatchToUnitAssignments.model";
import { Servers } from '../../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class BatchDetailsService extends ServiceBase<BatchDetailsModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "batchDetails", BatchDetailsModel, Servers.inventoryUrl);
  }

  assignProductToBatch(assignment: ProductBatchToUnitAssignments): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/ProductUnit/assign`;
    request.body = assignment.toJSON();

    return this.apiCaller.callApi(request).pipe(
      map(() => null)
    );
  }

  unassignProductFromBatch(assignment: { productUnitId: string, batchDetailsId: string }): Observable<void> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    request.endpoint = `${this.endpoint}/ProductUnit/unassign`;
    request.body = assignment;

    return this.apiCaller.callApi(request).pipe(
      map(() => null)
    );
  }
}
