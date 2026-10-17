import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, map, of } from "rxjs";
import { SettingCompanyProfile } from "src/app/models/companyData/companyData";
import { CompanyDetailsModel } from "src/app/models/inventory/companyDetails.model";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class CompanyDataService {
  private baseUrl = environment.server_urls[environment.active_server].serverUrl + 'api/SettingCopmanyProfiles';
  apiUrl: string = this.baseUrl;

  constructor(private http: HttpClient) { }
  getCompanyByUserId(userId: string): Observable<SettingCompanyProfile | null> {
    const url = `${this.apiUrl}?createdBy=${userId}`;
    return this.http.get<SettingCompanyProfile[]>(url).pipe(
      map((companies) => companies.length > 0 ? companies[0] : null),
      catchError(this.handleError<SettingCompanyProfile | null>('getCompanyByUserId', null))
    );
  }

  getFirstCompanySetting(): Observable<CompanyDetailsModel> {
    const url = `${this.apiUrl}/getCompany`;
    return this.http.get<CompanyDetailsModel>(url).pipe(
      catchError(this.handleError<CompanyDetailsModel>('getCompanySetting'))
    );
  }
  getCompanySetting(id: number): Observable<SettingCompanyProfile> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<SettingCompanyProfile>(url).pipe(
      catchError(this.handleError<SettingCompanyProfile>('getCompanySetting'))
    );
  }

  addCompanySetting(settingCompanyProfile: SettingCompanyProfile): Observable<SettingCompanyProfile> {
    return this.http.post<SettingCompanyProfile>(this.apiUrl, settingCompanyProfile).pipe(
      catchError(this.handleError<SettingCompanyProfile>('addCompanySetting'))
    );
  }

  updateCompanySetting(id: number, settingCompanyProfile: SettingCompanyProfile): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<void>(url, settingCompanyProfile).pipe(
      catchError(this.handleError<void>('updateCompanySetting'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error); // Log to console instead
      return of(result as T);
    };
  }
}
