import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {CompanyDetailsModel} from "../../models/inventory/companyDetails.model";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {Observable} from "rxjs";
import {map, shareReplay, catchError} from "rxjs/operators";
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface UploadResponse {
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyDetailsService extends ServiceBase<CompanyDetailsModel> {
  private readonly baseApi = environment.server_urls[environment.active_server][Servers.baseApi];
  private cachedCompanyList$: Observable<CompanyDetailsModel[]> | null = null;
  private readonly listFields: string[] = [
    'id',
    'arabicName',
    'englishName',
    'email',
    'address',
    'arabicAddress',
    'shortAddress',
    'buildingNumber',
    'subNumber',
    'district',
    'englishDistrict',
    'isActive',
    'createdBy',
    'createdAt',
    'phones',
    'bankAccounts',
    'taxNumber',
    'gaztNumber',
    'logoUrl',
    'stampUrl',
    'website',
    'unifiedNumber',
    'registrationNumber',
    'isZatcaIntegrated',
    'businessCategory',
    'isOnBoarded',
    'companyStatus',
    'companyStatusId',
    'policies',
    'branchDetails'
  ];

  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "companyDetails", CompanyDetailsModel, Servers.inventoryUrl);
  }

  /**
   * Clear the in-memory cache to force a fresh fetch from the server on the next request.
   */
  public clearCache(): void {
    this.cachedCompanyList$ = null;
  }

  override getAll(page: number = null, size: number = null): Observable<CompanyDetailsModel[]> {
    if (page !== null || size !== null) {
      return this.fetchSortedCompanies(page, size);
    }

    if (!this.cachedCompanyList$) {
      this.cachedCompanyList$ = this.fetchSortedCompanies(page, size).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError((err) => {
          this.clearCache();
          throw err;
        })
      );
    }

    return this.cachedCompanyList$;
  }

  private fetchSortedCompanies(page: number = null, size: number = null): Observable<CompanyDetailsModel[]> {
    return super.getAll(page, size, this.listFields).pipe(
      map((companies: CompanyDetailsModel[]) => {
        if (!companies || !Array.isArray(companies)) {
          return companies;
        }
        // ترتيب تصاعدي حسب أقدم تاريخ إنشاء (أول شركة تم إنشاؤها تكون أول عنصر في المصفوفة index 0)
        return [...companies].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
          return timeA - timeB;
        });
      })
    );
  }

  override update(entity: CompanyDetailsModel): Observable<CompanyDetailsModel> {
    this.clearCache();
    return super.update(entity);
  }

  override create(entity: CompanyDetailsModel): Observable<CompanyDetailsModel> {
    this.clearCache();
    return super.create(entity);
  }

  override delete(id: string): Observable<void> {
    this.clearCache();
    return super.delete(id);
  }

  toggleZatcaIntegration(id: string): Observable<CompanyDetailsModel> {
    this.clearCache();
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/toggleZatcaIntegration`;
    request.server_url = this.server_url;
    request.body = {
      id: id,
    };
    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  integrateZatca(id: string, otp: string): Observable<CompanyDetailsModel> {
    this.clearCache();
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/integrateZatca/${id}?otp=${otp}`;
    request.server_url = this.server_url;
    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  uploadLogo(companyDetailsId: string, file: File): Observable<UploadResponse> {
    this.clearCache();
    const formData = new FormData();
    formData.append('companyDetailsId', companyDetailsId);
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}company/upload-logo`, formData);
  }

  uploadLogoTemp(file: File): Observable<UploadResponse> {
    this.clearCache();
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}company/upload-logo-temp`, formData);
  }

  uploadStamp(companyDetailsId: string, file: File): Observable<UploadResponse> {
    this.clearCache();
    const formData = new FormData();
    formData.append('companyDetailsId', companyDetailsId);
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}company/upload-stamp`, formData);
  }

  uploadStampTemp(file: File): Observable<UploadResponse> {
    this.clearCache();
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UploadResponse>(`${this.baseApi}company/upload-stamp-temp`, formData);
  }
}
