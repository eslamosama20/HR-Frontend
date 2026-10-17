import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Treasury } from 'src/app/models/treasury/treasury';
import { environment } from 'src/environments/environment';
import { ServiceBase } from "../base/service-base.service";
import { RoomTypeModel } from "../../models/accounting/room-type-model";
import { ApiCallerService, APIRequest, HTTPVerbs } from "../api-caller.service";
import { Servers } from "../../enums/servers";
import { map } from "rxjs/operators";

export interface ImportFailure {
  row: number;
  name: string;
  reason: string;
  errorCode?: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  failed: ImportFailure[];
}

@Injectable({
  providedIn: 'root'
})
export class TreasuryService extends ServiceBase<Treasury> {
  constructor(apiCaller: ApiCallerService, private http: HttpClient) {
    super(apiCaller, "treasuries", Treasury, Servers.baseApi);
  }

  // ==================== Treasuries existing methods ====================
  getAllFrontal(page: number = null, size: number = null): Observable<Treasury[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    if (page && size) {
      request.endpoint = `${this.endpoint}/frontal?pageNumber=${page}&pageSize=${size}`;
    } else {
      request.endpoint = this.endpoint + '/frontal';
    }
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => (data ?? []).map((item: Partial<Treasury>) => new this.entityConstructor(item)))
    );
  }

  makeFrontal(treasuryId: string): Observable<Treasury> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `${this.endpoint}/frontal/${treasuryId}`;
    request.server_url = this.server_url;

    return this.apiCaller.callApi(request).pipe(
      map(data => new this.entityConstructor(data))
    );
  }

  importTreasuriesFromExcel(file: File): Observable<ImportResult> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.baseApi];
    const url = `${baseUrl}treasuries/import`;
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportResult>(url, formData);
  }

  downloadTemplate(): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.baseApi];
    const url = `${baseUrl}treasuries/template`;
    return this.http.get(url, { responseType: 'blob' });
  }

  // ==================== General Bank Accounts ====================

  /** GET /api/GeneralBankAccount */
  getAllGeneralBankAccounts(): Observable<GeneralBankAccount[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    // لاحظ: لا نستخدم this.endpoint الخاص بالخزائن هنا
    request.endpoint = 'GeneralBankAccount';
    request.server_url = this.server_url; // Servers.baseApi (تم تمريره في super)

    return this.apiCaller.callApi(request).pipe(
      map((data: any[]) => (data ?? []) as GeneralBankAccount[])
    );
  }
  updateGeneralBankAccount(payload: UpdateGeneralBankAccountDto): Observable<GeneralBankAccount> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.put;
    request.endpoint = 'GeneralBankAccount';
    request.server_url = this.server_url;
    // لازم تبعت الـ id داخل الـ body زي ما Swagger موضح
    request.body = payload;
  
    return this.apiCaller.callApi(request).pipe(
      map((data: any) => data as GeneralBankAccount)
    );
  }
  deleteGeneralBankAccount(id: string) {
    const request = new APIRequest();
    request.verb = HTTPVerbs.delete;
    // لاحظ أننا لا نستخدم this.endpoint الخاص بالخزائن
    request.endpoint = `GeneralBankAccount/${id}`;
    request.server_url = this.server_url; // ديناميكي (لوكال/سيرفر) حسب environment
  
    return this.apiCaller.callApi(request);
  }
  getGeneralBankAccountById(id: string): Observable<GeneralBankAccount> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `GeneralBankAccount/${id}`;
    request.server_url = this.server_url;
  
    return this.apiCaller.callApi(request).pipe(
      map((data: any) => data as GeneralBankAccount)
    );
  }
  /** POST /api/GeneralBankAccount — إنشاء حساب بنكي عام جديد */
  createGeneralBankAccount(payload: CreateGeneralBankAccountDto): Observable<GeneralBankAccount> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = 'GeneralBankAccount';
    request.server_url = this.server_url; // ديناميكي: local أو production حسب environment
    
    request.body = payload;

    return this.apiCaller.callApi(request).pipe(
      map((data: any) => data as GeneralBankAccount)
    );
  }
  getAllFrontalGeneralBankAccounts(): Observable<GeneralBankAccount[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = 'GeneralBankAccount/frontal';
    request.server_url = this.server_url;
  
    return this.apiCaller.callApi(request).pipe(
      map((data: any[]) => (data ?? []) as GeneralBankAccount[])
    );
  }
  
  /** POST /api/GeneralBankAccount/frontal/{id} */
  makeGeneralBankAccountFrontal(id: string): Observable<GeneralBankAccount> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.post;
    request.endpoint = `GeneralBankAccount/frontal/${id}`;
    request.server_url = this.server_url;
  
    return this.apiCaller.callApi(request).pipe(
      map((data: any) => data as GeneralBankAccount)
    );
  }

  importGeneralBankAccountsFromExcel(file: File): Observable<ImportResult> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.baseApi];
    const url = `${baseUrl}GeneralBankAccount/import`;
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportResult>(url, formData);
  }

  downloadGeneralBankAccountTemplate(): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.baseApi];
    const url = `${baseUrl}GeneralBankAccount/template`;
    return this.http.get(url, { responseType: 'blob' });
  }
}


/** مطابق لرد الـ API الذي عرضته عبر curl */
export interface GeneralBankAccount {
  id: string;
  bankName: string;
  bankAccountNumber?: string;   // 👈 optional
  accountName: string;
  bankBranchName?: string;
  swiftCode?: string;
  iban: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string | Date;
  mainAccountId?: string;
  isFrontal: boolean;
}

/** جسم الطلب المطلوب للـ POST كما في الـ Swagger */
export interface CreateGeneralBankAccountDto {
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  bankBranchName: string;
  swiftCode: string;
  iban: string;
  mainAccountId: string;
  isFrontal: boolean;
  isActive: boolean;
}

export interface UpdateGeneralBankAccountDto {
  id: string;
  bankName: string;
  bankAccountNumber: string;
  accountName: string;
  bankBranchName: string;
  swiftCode: string;
  iban: string;
  mainAccountId: string;
  isActive: boolean;
  isFrontal: boolean;
}
