import {Injectable} from '@angular/core';
import {catchError, map, Observable, tap, throwError} from 'rxjs';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {environment} from '../../../../../environments/environment';
import {AuthModel} from '../../models/auth.model';
import {UserAccountModel} from "../../../../models/auth/userAccount.model";
import { Servers } from 'src/app/enums/servers';

const API_USERS_URL = `${environment.server_urls[environment.active_server][Servers.authUrl]}Account`;

@Injectable({
  providedIn: 'root',
})
export class AuthHTTPService {
  constructor(private http: HttpClient) {}

  // === Helpers ===
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error:', error);
    if (error.status === 401) {
      return throwError(() => 'Not Found');
    } else {
      return throwError(() => 'An error occurred. Please try again later.');
    }
  }

  // === Public methods ===
  login(userName: string, password: string): Observable<any> {
    return this.http
      .post(`${API_USERS_URL}/login`, { userName, password })
      .pipe(catchError(this.handleError));
  }

  ResendOtp(userId: string = null): Observable<any> {
    return this.http.post(
      `${API_USERS_URL}/ResendOTP`,
      null,
      { params: { userId: userId ?? localStorage.getItem('userId')! } }
    );
  }

  createUser(user: any): Observable<any> {
    return this.http.post(`${API_USERS_URL}/Register`, user);
  }

  VerifyOtp(otp: string) {
    return this.http.post<AuthModel>(`${API_USERS_URL}/VerifyOTP`, {
      otpReference: localStorage.getItem('otpId'),
      otpValue: otp,
      userId: localStorage.getItem('userId'),
    })
    .pipe(
      map(response => {
        if (response.authToken && response.expiresIn) {
          localStorage.setItem('authToken', response.authToken);
          localStorage.setItem('refreshToken', response.refreshToken ?? '');
          localStorage.setItem('expiresIn', response.expiresIn.toString());
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  VerifyOtpAndSetNewPassword(otp: string, userId: string, otpId: string, password: string) {
    return this.http.post<AuthModel>(`${API_USERS_URL}/VerifyOTPAndSetNewPassword`, {
      otpReference: otpId,
      otpValue: otp,
      userId: userId,
      newPassword: password,
    })
    .pipe(
      map(response => {
        if (response.authToken && response.expiresIn) {
          localStorage.setItem('authToken', response.authToken);
          localStorage.setItem('refreshToken', response.refreshToken ?? '');
          localStorage.setItem('expiresIn', response.expiresIn.toString());
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  forgotPassword(email: string): Observable<boolean> {
    return this.http.post<boolean>(`${API_USERS_URL}/forgot-password`, { email });
  }

  getUserByToken(token: string): Observable<UserAccountModel> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<UserAccountModel>(`${API_USERS_URL}`, { headers }).pipe(
      tap({
        error: () => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('token');
        },
      })
    );
  }

  toggleTwoFactorEnabled(userId: string): Observable<any> {
    return this.http
      .post(`${API_USERS_URL}/toggle-two-factor-enabled`, { userId })
      .pipe(
        tap((response) => console.log('toggleTwoFactorEnabled response:', response)),
        catchError(this.handleError)
      );
  }

  // === NEW: Change Password ===
  changePassword(oldPassword: string, newPassword: string): Observable<AuthModel> {
    const headers = this.authHeaders();
    return this.http
      .post<AuthModel>(
        `${API_USERS_URL}/ChangePassword`,
        { oldPassword, newPassword },
        { headers }
      )
      .pipe(
        // احفظ التوكن الجديد لو رجع
        map((response) => {
          if (response?.authToken) {
            localStorage.setItem('authToken', response.authToken);
          }
          if (response?.refreshToken !== undefined && response?.refreshToken !== null) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          if (response?.expiresIn) {
            localStorage.setItem('expiresIn', response.expiresIn.toString());
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }
}
