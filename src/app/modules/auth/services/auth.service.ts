import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, of, Subscription} from 'rxjs';
import {finalize, map, switchMap} from 'rxjs/operators';
import {UserModel} from '../models/user.model';
import {AuthModel, RegisterationAndloginResponse} from '../models/auth.model';
import {AuthHTTPService} from './auth-http';
import {environment} from 'src/environments/environment';
import {Router} from '@angular/router';
import {UserAccountModel} from "../../../models/auth/userAccount.model";

export type UserType = UserAccountModel | undefined;

export type UserPermissionCache = { userId: string; permissions: string[] } | null;

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  currentUser$: Observable<UserType>;
  isLoading$: Observable<boolean>;
  currentUserSubject: BehaviorSubject<UserType>;
  isLoadingSubject: BehaviorSubject<boolean>;

  private unsubscribe: Subscription[] = [];
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
  private readonly userCacheStorageKey = `${environment.appVersion}-${environment.USERDATA_KEY}-account`;
  private permissionCache: UserPermissionCache = null;

  constructor(
    private authHttpService: AuthHTTPService,
    private router: Router
  ) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.currentUserSubject = new BehaviorSubject<UserType>(undefined);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  ResendOtp(userId: string = null): Observable<any> {
    return this.authHttpService.ResendOtp(userId).pipe(
      map((response) => {
        localStorage.setItem('otpId', response);
      })
    );
  }

  get currentUserValue(): UserType {
    return this.currentUserSubject.value;
  }

  set currentUserValue(user: UserType) {
    this.currentUserSubject.next(user);
  }

  login(userName: string, password: string): Observable<AuthModel | RegisterationAndloginResponse> {
    this.isLoadingSubject.next(true);
    return this.authHttpService.login(userName, password).pipe(
      map((res: RegisterationAndloginResponse | AuthModel) => {
        // @ts-ignore
        if (res.userId && res.otpId) {
          // @ts-ignore
          const result = this.setLoginResponseInLocalStorage(res);
          return res;
        } else {
          return res;
        }
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  registration(user: UserModel) {
    this.isLoadingSubject.next(true);
    return this.authHttpService.createUser(user).pipe(
      map((res: RegisterationAndloginResponse) => {
        const result = this.setLoginResponseInLocalStorage(res);
        return result;
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  VerifyOtp(otp: string) {
    this.isLoadingSubject.next(true);
    return this.authHttpService.VerifyOtp(otp).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  verifyOtpAndSetNewPassword(otp: string, userId: string, otpId: string, password: string) {
    this.isLoadingSubject.next(true);
    return this.authHttpService.VerifyOtpAndSetNewPassword(otp, userId, otpId, password).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  // === NEW: Change Password via service ===
  changePassword(oldPassword: string, newPassword: string): Observable<AuthModel> {
    this.isLoadingSubject.next(true);
    return this.authHttpService.changePassword(oldPassword, newPassword).pipe(
      // بعد حفظ الـ token الجديد، نحدّث بيانات المستخدم (اختياري لكن مفيد)
      switchMap((res) => {
        const token = localStorage.getItem('authToken');
        if (!token) return of(res);
        return this.authHttpService.getUserByToken(token).pipe(
          map((user) => {
            if (user) this.currentUserSubject.next(user);
            return res;
          })
        );
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  saveTokenAfterOTP() {}

  logout() {
    this.clearAuthCache();

    this.router.navigate(['/auth/login'], {
      queryParams: {},
    });
  }

  getCachedToken(): string | null {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!authToken) {
      return null;
    }

    if (this.isTokenExpired(authToken)) {
      this.clearAuthCache();
      return null;
    }

    return authToken;
  }

  getCachedUser(): UserType {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      return currentUser;
    }

    try {
      const cachedUser = localStorage.getItem(this.userCacheStorageKey);
      if (!cachedUser) {
        return undefined;
      }

      const user = JSON.parse(cachedUser) as UserAccountModel;
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  clearAuthCache() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem(this.userCacheStorageKey);

    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');

    this.currentUserSubject.next(undefined);
    this.clearPermissionCache();
  }

  getUserByToken(): Observable<UserType> {
    const auth = this.getCachedToken();
    if (!auth) {
      localStorage.removeItem(this.userCacheStorageKey);
      this.currentUserSubject.next(undefined);
      this.permissionCache = null;
      return of(undefined);
    }

    const cachedUser = this.getCachedUser();
    if (cachedUser) {
      return of(cachedUser);
    }

    this.isLoadingSubject.next(true);
    return this.authHttpService.getUserByToken(auth).pipe(
      map((user: UserType) => {
        if (user) {
          this.currentUserSubject.next(user);
          localStorage.setItem(this.userCacheStorageKey, JSON.stringify(user));
          this.buildPermissionCache(user);
        } else {
          this.logout();
        }
        return user;
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  getUserPermissions(user?: UserType): string[] {
    const target = user || this.currentUserValue;
    if (!target) {
      return [];
    }

    if (this.permissionCache && this.permissionCache.userId === target.id) {
      return this.permissionCache.permissions;
    }

    const permissions = this.extractPermissions(target);
    this.permissionCache = { userId: target.id, permissions };
    return permissions;
  }

  hasPermission(permission: string, user?: UserType): boolean {
    const target = user || this.currentUserValue;
    if (!target) return false;

    const isDev = target.userName === 'developer' || target.userName === 'sys_developer' || target.email === 'developer@smartapro.com' || target.userRoles?.some(ur => ur.role?.name === 'System.Developer');
    const isAdmin = target.userName === 'admin' || target.email === 'admin@admin.com' || target.userRoles?.some(ur => ur.role?.name === 'System.Admin');

    if (isAdmin || isDev) {
      if (!isDev && permission.startsWith('System.DevOnly.')) {
        return false;
      }
      return true;
    }

    return this.getUserPermissions(target).includes(permission);
  }

  hasAnyPermission(permissions: string[], user?: UserType): boolean {
    return permissions.some((p) => this.hasPermission(p, user));
  }

  private extractPermissions(user: UserType): string[] {
    if (!user?.userRoles) {
      return [];
    }

    const permissions = new Set<string>();
    for (const ur of user.userRoles) {
      if (ur.role?.rolePermissions) {
        for (const rp of ur.role.rolePermissions) {
          if (rp.permission?.name) {
            permissions.add(rp.permission.name);
          }
        }
      }
    }
    return Array.from(permissions);
  }

  private buildPermissionCache(user: UserType): void {
    if (user) {
      this.permissionCache = {
        userId: user.id,
        permissions: this.extractPermissions(user),
      };
    }
  }

  private clearPermissionCache(): void {
    this.permissionCache = null;
  }

  forgotPassword(email: string): Observable<boolean> {
    this.isLoadingSubject.next(true);
    return this.authHttpService
      .forgotPassword(email)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }

  private setLoginResponseInLocalStorage(res: RegisterationAndloginResponse): boolean {
    if (res) {
      localStorage.setItem('otpId', res.otpId);
      localStorage.setItem('userId', res.userId);
      return true;
    }
    return false;
  }

  private setAuthFromLocalStorage(auth: RegisterationAndloginResponse): boolean {
    if (auth) {
      localStorage.setItem(this.authLocalStorageToken, JSON.stringify(auth));
      return true;
    }
    return false;
  }

  private getAuthFromLocalStorage(): AuthModel | undefined {
    try {
      const lsValue = localStorage.getItem(this.authLocalStorageToken);
      if (!lsValue) {
        return undefined;
      }
      const authData = JSON.parse(lsValue);
      return authData;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  toggleTwoFactorEnabled(userId: string) {
    this.isLoadingSubject.next(true);
    return this.authHttpService.toggleTwoFactorEnabled(userId).pipe(
      map((res: any) => {
        this.currentUserSubject.next(res);
        localStorage.setItem(this.userCacheStorageKey, JSON.stringify(res));
        return res;
      }),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }

  /** JWT payloads are base64url (uses '-'/'_', no padding) and may contain raw UTF-8 (e.g. Arabic names). atob() is not safe for them. */
  decodeJwtPayload(payloadPart?: string): any | null {
    try {
      if (!payloadPart) {
        return null;
      }
      // base64url -> base64
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      // restore padding so strict atob() accepts it
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      // atob yields latin1 bytes; re-decode as UTF-8 so Arabic/emoji claims survive
      const latin1 = atob(padded);
      const utf8 = new TextDecoder('utf-8').decode(
        Uint8Array.from(latin1, (c) => c.charCodeAt(0))
      );
      return JSON.parse(utf8);
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const tokenPayload = token.split('.')[1];
    // No payload segment at all → structurally invalid; treat as expired.
    if (!tokenPayload) {
      return true;
    }

    const payload = this.decodeJwtPayload(tokenPayload);
    const exp = payload?.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
      // Unreadable payload (e.g. Arabic-name accounts) or missing/malformed exp must NOT
      // force a logout here — real expiry is enforced by the server via 401.
      return false;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp <= nowInSeconds;
  }
}
