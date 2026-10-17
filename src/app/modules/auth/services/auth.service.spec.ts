import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthHTTPService } from './auth-http';

describe('AuthService - Permission Methods', () => {
  let service: AuthService;
  let authHttpServiceSpy: jasmine.SpyObj<AuthHTTPService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUserWithPermissions = {
    id: 'user-1',
    userRoles: [
      {
        role: {
          rolePermissions: [
            { permission: { name: 'Dashboard.Read' } },
            { permission: { name: 'SalesInvoice.Read' } },
            { permission: { name: 'Cashier.POS' } },
          ],
        },
      },
      {
        role: {
          rolePermissions: [
            { permission: { name: 'Account.Read' } },
          ],
        },
      },
    ],
  } as any;

  const mockUserNoRoles = {
    id: 'user-2',
    userRoles: [],
  } as any;

  const mockUserNullRoles = {
    id: 'user-3',
    userRoles: null,
  } as any;

  const mockUserDuplicatePermissions = {
    id: 'user-4',
    userRoles: [
      {
        role: {
          rolePermissions: [
            { permission: { name: 'Dashboard.Read' } },
            { permission: { name: 'SalesInvoice.Read' } },
          ],
        },
      },
      {
        role: {
          rolePermissions: [
            { permission: { name: 'Dashboard.Read' } },
            { permission: { name: 'Cashier.POS' } },
          ],
        },
      },
    ],
  } as any;

  beforeEach(() => {
    authHttpServiceSpy = jasmine.createSpyObj('AuthHTTPService', [
      'login',
      'getUserByToken',
      'forgotPassword',
      'ResendOtp',
      'VerifyOtp',
      'VerifyOtpAndSetNewPassword',
      'changePassword',
      'toggleTwoFactorEnabled',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthHTTPService, useValue: authHttpServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserPermissions', () => {
    it('should return empty array when user is null', () => {
      const result = service.getUserPermissions(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array when user is undefined', () => {
      const result = service.getUserPermissions(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array when user has no userRoles', () => {
      const result = service.getUserPermissions(mockUserNoRoles as any);
      expect(result).toEqual([]);
    });

    it('should return empty array when userRoles is null', () => {
      const result = service.getUserPermissions(mockUserNullRoles as any);
      expect(result).toEqual([]);
    });

    it('should extract permission names from user roles', () => {
      const result = service.getUserPermissions(mockUserWithPermissions as any);
      expect(result).toEqual(
        jasmine.arrayContaining(['Dashboard.Read', 'SalesInvoice.Read', 'Cashier.POS', 'Account.Read'])
      );
      expect(result.length).toBe(4);
    });

    it('should deduplicate permissions across multiple roles', () => {
      const result = service.getUserPermissions(mockUserDuplicatePermissions as any);
      expect(result).toEqual(
        jasmine.arrayContaining(['Dashboard.Read', 'SalesInvoice.Read', 'Cashier.POS'])
      );
      expect(result.length).toBe(3);
    });

    it('should use currentUserValue when no user argument provided', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      const result = service.getUserPermissions();
      expect(result).toEqual(
        jasmine.arrayContaining(['Dashboard.Read', 'SalesInvoice.Read', 'Cashier.POS', 'Account.Read'])
      );
    });

    it('should cache permissions for same user', () => {
      const result1 = service.getUserPermissions(mockUserWithPermissions as any);
      const result2 = service.getUserPermissions(mockUserWithPermissions as any);
      expect(result1).toBe(result2);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      expect(service.hasPermission('Dashboard.Read')).toBeTrue();
    });

    it('should return false when user lacks the permission', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      expect(service.hasPermission('Admin.Read')).toBeFalse();
    });

    it('should return false when user has no permissions', () => {
      service.currentUserSubject.next(mockUserNoRoles as any);
      expect(service.hasPermission('Dashboard.Read')).toBeFalse();
    });

    it('should check against provided user argument', () => {
      expect(service.hasPermission('Dashboard.Read', mockUserWithPermissions as any)).toBeTrue();
      expect(service.hasPermission('Admin.Read', mockUserWithPermissions as any)).toBeFalse();
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one of the permissions', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      expect(service.hasAnyPermission(['Dashboard.Read', 'Admin.Read'])).toBeTrue();
    });

    it('should return true when user has all permissions', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      expect(service.hasAnyPermission(['Dashboard.Read', 'SalesInvoice.Read'])).toBeTrue();
    });

    it('should return false when user has none of the permissions', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      expect(service.hasAnyPermission(['Admin.Read', 'SuperAdmin.Read'])).toBeFalse();
    });

    it('should return false when permissions array is empty', () => {
      service.currentUserSubject.next(mockUserWithPermissions as any);
      expect(service.hasAnyPermission([])).toBeFalse();
    });

    it('should return false when user has no permissions', () => {
      service.currentUserSubject.next(mockUserNoRoles as any);
      expect(service.hasAnyPermission(['Dashboard.Read'])).toBeFalse();
    });

    it('should check against provided user argument', () => {
      expect(service.hasAnyPermission(['Dashboard.Read'], mockUserWithPermissions as any)).toBeTrue();
      expect(service.hasAnyPermission(['Admin.Read'], mockUserWithPermissions as any)).toBeFalse();
    });
  });

  describe('permission cache', () => {
    it('should invalidate cache when different user is queried', () => {
      const result1 = service.getUserPermissions(mockUserWithPermissions as any);
      const result2 = service.getUserPermissions(mockUserNoRoles as any);
      expect(result1).not.toBe(result2);
      expect(result1.length).toBe(4);
      expect(result2.length).toBe(0);
    });

    it('should return cached result for same user id', () => {
      const result1 = service.getUserPermissions(mockUserWithPermissions as any);
      const result2 = service.getUserPermissions(mockUserWithPermissions as any);
      expect(result1).toBe(result2);
    });
  });

  describe('JWT payload decode + expiry (login-stuck bug)', () => {
    // Real JWT payload issued by the rawahel backend for account `smart`:
    // contains a base64url '_' AND raw Arabic UTF-8 claims (givenname/surname/role),
    // which is exactly what broke JSON.parse(atob(payload)) in production.
    const realSmartPayload =
      'eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJlbmcuc2FtZWhmYXppZUB5YWhvby5jb20iLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiMjhhMjdjNjctMzUyZC00MGJhLTRjMWMtMDhkZGVhZGZhZjAzIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvZ2l2ZW5uYW1lIjoi2KjYsdmG2KfZhdisIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvc3VybmFtZSI6Itin2YTZgdmG2KfYr9mCIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbItin2K_Yp9ix2Kkg2KfZhNit2KzZiNiy2KfYqiDZiNin2YTZhdio2YrYudin2KoiLCJDYXNoaWVyIl0sImV4cCI6MTc4NzY3NTkwMywiaXNzIjoiaHR0cHM6Ly9sb2NhbGhvc3Q6NDQzNjAvIn0';

    function b64url(input: any): string {
      const utf8 = new TextEncoder().encode(
        typeof input === 'string' ? input : JSON.stringify(input)
      );
      let bin = '';
      utf8.forEach((b) => (bin += String.fromCharCode(b)));
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function fakeToken(payloadPart: string): string {
      return `header.${payloadPart}.sig`;
    }

    afterEach(() => {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    });

    it('decodes a plain ASCII base64url payload without padding', () => {
      const payload = b64url({ exp: 4102444800 });
      expect(payload.endsWith('=')).toBeFalse();
      expect(service.decodeJwtPayload(payload)).toEqual({ exp: 4102444800 } as any);
    });

    it('decodes the real rawahel `smart` payload (base64url "_" + Arabic UTF-8)', () => {
      expect(realSmartPayload).toContain('_');
      const decoded = service.decodeJwtPayload(realSmartPayload) as any;
      expect(decoded).not.toBeNull();
      expect(decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']).toBe('برنامج');
      const roleClaim =
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
      expect(decoded[roleClaim]).toEqual(['ادارة الحجوزات والمبيعات', 'Cashier']);
    });

    it('decodes a general Arabic-claims payload via the UTF-8 path', () => {
      const payload = b64url({ role: 'ادارة الحجوزات والمبيعات', exp: 4102444800 });
      const decoded = service.decodeJwtPayload(payload) as any;
      expect(decoded.role).toBe('ادارة الحجوزات والمبيعات');
      expect(decoded.exp).toBe(4102444800);
    });

    it('treats a future-exp token with Arabic payload as NOT expired (no logout)', () => {
      localStorage.setItem('authToken', fakeToken(b64url({ role: 'ادارة الحجوزات', exp: 4102444800 })));
      // Old code returned null here (isTokenExpired -> true -> clearAuthCache).
      expect(service.getCachedToken()).toBeTruthy();
      expect(localStorage.getItem('authToken')).toBeTruthy();
    });

    it('still treats an actually-expired token as expired', () => {
      localStorage.setItem('authToken', fakeToken(b64url({ exp: 1 })));
      expect(service.getCachedToken()).toBeNull();
      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('restores `==` padding when unpadded base64url length % 4 === 2', () => {
      // '{"x":1}' = 7 UTF-8 bytes → unpadded base64url length 10 (10 % 4 === 2)
      const payload = b64url('{"x":1}');
      expect(payload.length % 4).toBe(2);
      expect(service.decodeJwtPayload(payload)).toEqual({ x: 1 } as any);
    });

    it('restores `=` padding when unpadded base64url length % 4 === 3', () => {
      // '{"a":"bcd"}' = 11 UTF-8 bytes → unpadded base64url length 15 (15 % 4 === 3)
      const payload = b64url('{"a":"bcd"}');
      expect(payload.length % 4).toBe(3);
      expect(service.decodeJwtPayload(payload)).toEqual({ a: 'bcd' } as any);
    });

    it('returns null for invalid payload length % 4 === 1 (malformed base64)', () => {
      // Legit base64url can never have length % 4 === 1; force it by appending
      // one char at a time so atob() rejects the malformed input safely.
      let malformed = b64url({ exp: 4102444800 });
      while (malformed.length % 4 !== 1) {
        malformed += 'A';
      }
      expect(service.decodeJwtPayload(malformed)).toBeNull();
    });

    it('returns null when payloadPart is undefined', () => {
      expect(service.decodeJwtPayload(undefined)).toBeNull();
    });

    it('returns null for valid base64 of malformed JSON', () => {
      const payload = b64url('this is not json');
      expect(service.decodeJwtPayload(payload)).toBeNull();
    });

    it('keeps the token when payload has NO exp claim (not expired)', () => {
      localStorage.setItem('authToken', fakeToken(b64url({ sub: 'user-1' })));
      expect(service.getCachedToken()).toBeTruthy();
      expect(localStorage.getItem('authToken')).toBeTruthy();
    });

    it('treats exp: 0 as EXPIRED (numeric zero must not be "missing")', () => {
      localStorage.setItem('authToken', fakeToken(b64url({ exp: 0 })));
      expect(service.getCachedToken()).toBeNull();
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });
});
