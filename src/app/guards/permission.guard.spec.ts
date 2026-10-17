import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { PermissionGuard } from './permission.guard';
import { AuthService } from '../modules/auth/services/auth.service';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser = {
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
    ],
  } as any;

  function createRoute(data: Record<string, any>): ActivatedRouteSnapshot {
    return { data } as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUserByToken',
      'getUserPermissions',
      'logout',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        PermissionGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(PermissionGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should return true when route has no permissions data', () => {
      const route = createRoute({});
      const state = { url: '/dashboard' } as any;

      authServiceSpy.currentUserValue = mockUser;
      authServiceSpy.getUserPermissions.and.returnValue(['Dashboard.Read']);

      const result = guard.canActivate(route, state);
      expect(result).toBeInstanceOf(of(true).constructor);
    });

    it('should return true when route has empty permissions array', () => {
      const route = createRoute({ permissions: [] });
      const state = { url: '/dashboard' } as any;

      authServiceSpy.currentUserValue = mockUser;

      const result = guard.canActivate(route, state);
      expect(result).toBeInstanceOf(of(true).constructor);
    });

    it('should return true when user has matching permission', () => {
      const route = createRoute({ permissions: ['Dashboard.Read'] });
      const state = { url: '/dashboard' } as any;

      authServiceSpy.currentUserValue = mockUser;
      authServiceSpy.getUserPermissions.and.returnValue(['Dashboard.Read']);

      const result = guard.canActivate(route, state);
      let resultValue: any;
      (result as any).subscribe((v: any) => (resultValue = v));

      expect(resultValue).toBeTrue();
    });

    it('should return true when user has one of multiple required permissions', () => {
      const route = createRoute({
        permissions: ['Dashboard.Read', 'Admin.Read'],
      });
      const state = { url: '/dashboard' } as any;

      authServiceSpy.currentUserValue = mockUser;
      authServiceSpy.getUserPermissions.and.returnValue(['Dashboard.Read']);

      const result = guard.canActivate(route, state);
      let resultValue: any;
      (result as any).subscribe((v: any) => (resultValue = v));

      expect(resultValue).toBeTrue();
    });

    it('should return UrlTree to /unauthorized when user lacks permission', () => {
      const route = createRoute({ permissions: ['Admin.Read'] });
      const state = { url: '/admin' } as any;
      const mockUrlTree = { toString: () => '/unauthorized' } as UrlTree;

      authServiceSpy.currentUserValue = mockUser;
      authServiceSpy.getUserPermissions.and.returnValue(['Dashboard.Read']);
      routerSpy.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivate(route, state);
      let resultValue: any;
      (result as any).subscribe((v: any) => (resultValue = v));

      expect(resultValue).toBe(mockUrlTree);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
    });

    it('should call getUserByToken when currentUserValue is null and return true if user found', () => {
      const route = createRoute({ permissions: ['Dashboard.Read'] });
      const state = { url: '/dashboard' } as any;

      authServiceSpy.currentUserValue = null as any;
      authServiceSpy.getUserByToken.and.returnValue(of(mockUser));
      authServiceSpy.getUserPermissions.and.returnValue(['Dashboard.Read']);

      const result = guard.canActivate(route, state);
      let resultValue: any;
      (result as any).subscribe((v: any) => (resultValue = v));

      expect(authServiceSpy.getUserByToken).toHaveBeenCalled();
      expect(resultValue).toBeTrue();
    });

    it('should redirect to login when getUserByToken returns null', () => {
      const route = createRoute({ permissions: ['Dashboard.Read'] });
      const state = { url: '/dashboard' } as any;
      const mockLoginTree = { toString: () => '/auth/login' } as UrlTree;

      authServiceSpy.currentUserValue = null as any;
      authServiceSpy.getUserByToken.and.returnValue(of(undefined));
      routerSpy.createUrlTree.and.returnValue(mockLoginTree);

      const result = guard.canActivate(route, state);
      let resultValue: any;
      (result as any).subscribe((v: any) => (resultValue = v));

      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(resultValue).toBe(mockLoginTree);
    });
  });

  describe('canActivateChild', () => {
    it('should delegate to checkPermission (return true for no permissions)', () => {
      const childRoute = createRoute({});
      const state = { url: '/dashboard/settings' } as any;

      authServiceSpy.currentUserValue = mockUser;

      const result = guard.canActivateChild(childRoute, state);
      expect(result).toBeInstanceOf(of(true).constructor);
    });

    it('should check permissions on child route', () => {
      const childRoute = createRoute({ permissions: ['Admin.Read'] });
      const state = { url: '/admin/settings' } as any;
      const mockUrlTree = { toString: () => '/unauthorized' } as UrlTree;

      authServiceSpy.currentUserValue = mockUser;
      authServiceSpy.getUserPermissions.and.returnValue(['Dashboard.Read']);
      routerSpy.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivateChild(childRoute, state);
      let resultValue: any;
      (result as any).subscribe((v: any) => (resultValue = v));

      expect(resultValue).toBe(mockUrlTree);
    });
  });
});
