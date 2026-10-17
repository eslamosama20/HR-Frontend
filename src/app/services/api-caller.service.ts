import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {catchError, Observable, of, throwError, timeout} from 'rxjs';
import {environment} from 'src/environments/environment';
import {Servers} from '../enums/servers';

@Injectable({
  providedIn: 'root'
})
export class ApiCallerService {
  private readonly DEFAULT_TIMEOUT_MS = 30_000;
  headers: any = {};

  constructor(private http: HttpClient) {
  } //, private translateService: TranslateService

  callApi(request: APIRequest): Observable<any> {
    const effectiveTimeoutMs = request.timeoutMs ?? this.DEFAULT_TIMEOUT_MS;
    const serverConfig = environment.server_urls[environment.active_server] || {};
    let serverBase = serverConfig[request.server_url];

    if (!serverBase && (request.server_url === Servers.hrUrl || request.server_url === 'hrUrl')) {
      serverBase = serverConfig.hrUrl || (serverConfig.baseApi ? `${serverConfig.baseApi}hr/` : undefined);
    }
    if (!serverBase && serverConfig.baseApi) {
      serverBase = serverConfig.baseApi;
    }

    let url = `${serverBase || ''}${request.endpoint}`;

    this.headers = {
      "Access-Control-Allow-Origin": "*",
      // "app-lang": this.translateService.currentLang,
      // "request-source": this.platform.is("mobile") ? "mobile" : "web",
      // "app-platform": this.platform.platforms(),
      "h-n": window.location.hostname,
      "Content-Type": "application/json"
    };

    const httpOptions = {headers: this.headers, withCredentials: request.authorized};


    switch (request.verb) {
      case HTTPVerbs.get:
        return this.http.get(url, httpOptions).pipe(
          timeout(effectiveTimeoutMs),
          catchError((err) => {
            if (request.notifyIfError) {
              return this.apiErrorNotifier(err);
            } else {
              return throwError(err);
            }
          }));

      case HTTPVerbs.post:
        return this.http.post(url,
          request.body, {
            headers: this.headers,
          }).pipe(
          timeout(effectiveTimeoutMs),
          catchError((err) => {
          if (request.notifyIfError) {
            return this.apiErrorNotifier(err);
          } else {
            return throwError(err);
          }
        }));

      case HTTPVerbs.put:
        return this.http.put(url,
          request.body, {
            headers: this.headers,
          }).pipe(
          timeout(effectiveTimeoutMs),
          catchError((err) => {
          if (request.notifyIfError) {
            return this.apiErrorNotifier(err);
          } else {
            return throwError(err);
          }
        }));
      case HTTPVerbs.delete:
        return this.http.delete(url, {
          headers: this.headers,
        }).pipe(
          timeout(effectiveTimeoutMs),
          catchError((err) => {
          if (request.notifyIfError) {
            return this.apiErrorNotifier(err);
          } else {
            return throwError(err);
          }
        }));
      default:
        break;
    }
    return null;
  }

  apiErrorNotifier(error): Observable<any> {
    if (error instanceof HttpErrorResponse) {
      if (error.error && error.error.ErrorMessage) {
        console.log(error.error.ErrorMessage);
      }
    }
    return of(error);
  }
}

export class APIRequest {
  server_url: string;
  verb: HTTPVerbs;
  base_url?: string = environment.server_urls[environment.active_server];
  endpoint: string = '';
  body?: object = null;
  authorized?: boolean = false;
  notifyIfError?: boolean = false;
  timeoutMs?: number;
}

export enum HTTPVerbs {
  get = 1,
  post,
  put,
  delete
}
