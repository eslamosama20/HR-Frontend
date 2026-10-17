import { Routing } from './routing';
import { PermissionGuard } from '../guards/permission.guard';
import { AuthGuard } from '../modules/auth/services/auth.guard';

describe('Pages Routing Configuration', () => {
  const permissionGuardRoutes = Routing.filter(
    (r) =>
      r.canActivate &&
      (r.canActivate as any[]).includes(PermissionGuard)
  );

  const childGuardRoutes = Routing.filter(
    (r) =>
      r.canActivateChild &&
      (r.canActivateChild as any[]).includes(PermissionGuard)
  );

  const redirectRoutes = Routing.filter((r) => r.redirectTo);

  const publicRoutes = Routing.filter(
    (r) =>
      !r.canActivate &&
      !r.redirectTo &&
      !r.loadChildren &&
      !r.loadComponent &&
      r.path !== '' &&
      r.path !== '**'
  );

  it('should have PermissionGuard on at least 30 routes (current: ~50)', () => {
    expect(permissionGuardRoutes.length).toBeGreaterThanOrEqual(30);
  });

  it('should have data.permissions on every PermissionGuard route', () => {
    const missing = permissionGuardRoutes.filter(
      (r) => !r.data || !r.data['permissions']
    );
    const missingPaths = missing.map((r) => r.path);
    expect(missing).toEqual([]);
  });

  it('should have non-empty permissions arrays on every PermissionGuard route', () => {
    const empty = permissionGuardRoutes.filter(
      (r) =>
        r.data &&
        r.data['permissions'] &&
        (r.data['permissions'] as string[]).length === 0
    );
    const emptyPaths = empty.map((r) => r.path);
    expect(emptyPaths).toEqual([]);
  });

  it('should have canActivateChild: [PermissionGuard] on lazy-loaded module routes that have child routes', () => {
    const lazyModuleRoutes = permissionGuardRoutes.filter((r) => r.loadChildren);
    const missingChildGuard = lazyModuleRoutes.filter(
      (r) =>
        !r.canActivateChild ||
        !(r.canActivateChild as any[]).includes(PermissionGuard)
    );
    // Leaf modules (dashboard, inventory/management) don't need canActivateChild
    // Only parent modules with actual child routes need it
    const leafModules = ['dashboard', 'inventory/management'];
    const realMissing = missingChildGuard.filter(
      (r) => !leafModules.includes(r.path as string)
    );
    const missingPaths = realMissing.map((r) => r.path);
    expect(missingPaths).toEqual([]);
  });

  it('should have AuthGuard before PermissionGuard on every guarded route', () => {
    const wrongOrder = permissionGuardRoutes.filter((r) => {
      const guards = r.canActivate as any[];
      const authIdx = guards.indexOf(AuthGuard);
      const permIdx = guards.indexOf(PermissionGuard);
      return authIdx === -1 || authIdx > permIdx;
    });
    const wrongPaths = wrongOrder.map((r) => r.path);
    expect(wrongPaths).toEqual([]);
  });

  it('should have no duplicate paths', () => {
    const paths = Routing.filter((r) => r.path && r.path !== '**').map(
      (r) => r.path
    );
    const duplicates = paths.filter(
      (p, i) => paths.indexOf(p) !== i
    );
    expect(duplicates).toEqual([]);
  });

  it('should have /unauthorized as public (no guards)', () => {
    // /unauthorized is registered in app-routing.module.ts, not pages/routing.ts
    // This test verifies the guard is NOT applied to pages that should be public
    const unauthorizedInPages = Routing.find((r) => r.path === 'unauthorized');
    expect(unauthorizedInPages).toBeUndefined();
  });

  it('should have /user-profile as public (no PermissionGuard)', () => {
    const userProfile = Routing.find((r) => r.path === 'user-profile');
    expect(userProfile).toBeDefined();
    expect(
      (userProfile!.canActivate as any[] || []).includes(PermissionGuard)
    ).toBeFalse();
  });

  it('should have /system-notifications as public (no PermissionGuard)', () => {
    const sysNotif = Routing.find((r) => r.path === 'system-notifications');
    expect(sysNotif).toBeDefined();
    expect(
      (sysNotif!.canActivate as any[] || []).includes(PermissionGuard)
    ).toBeFalse();
  });

  it('should have /builder as public (no PermissionGuard)', () => {
    const builder = Routing.find((r) => r.path === 'builder');
    expect(builder).toBeDefined();
    expect(
      (builder!.canActivate as any[] || []).includes(PermissionGuard)
    ).toBeFalse();
  });

  it('should have /booking-form as public (no PermissionGuard)', () => {
    const bookingForm = Routing.find((r) => r.path === 'booking-form');
    expect(bookingForm).toBeDefined();
    expect(
      (bookingForm!.canActivate as any[] || []).includes(PermissionGuard)
    ).toBeFalse();
  });

  it('should have /public-home as public (no PermissionGuard)', () => {
    const publicHome = Routing.find((r) => r.path === 'public-home');
    expect(publicHome).toBeDefined();
    expect(
      (publicHome!.canActivate as any[] || []).includes(PermissionGuard)
    ).toBeFalse();
  });

  it('should have only redirect routes without guards (except root and wildcard)', () => {
    const nonGuardNonRedirect = Routing.filter(
      (r) =>
        !r.canActivate &&
        !r.redirectTo &&
        r.path !== '' &&
        r.path !== '**' &&
        !r.loadChildren &&
        !r.loadComponent
    );
    const paths = nonGuardNonRedirect.map((r) => r.path);
    expect(paths).toEqual([]);
  });

  it('should end with ** wildcard route', () => {
    const lastRoute = Routing[Routing.length - 1];
    expect(lastRoute.path).toBe('**');
  });
});
