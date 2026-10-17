import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../modules/auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.checkPermission(route, state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.checkPermission(childRoute, state.url);
  }

  private checkPermission(
    route: ActivatedRouteSnapshot,
    targetUrl: string
  ): Observable<boolean | UrlTree> {
    const requiredPermissions: string[] = route.data?.['permissions'];

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return of(true);
    }

    const user = this.authService.currentUserValue;
    if (!user) {
      return this.authService.getUserByToken().pipe(
        take(1),
        map((u) => {
          if (!u) {
            this.authService.logout();
            return this.router.createUrlTree(['/auth/login']);
          }
          return this.hasAnyPermission(u, requiredPermissions, targetUrl);
        })
      );
    }

    return of(this.hasAnyPermission(user, requiredPermissions, targetUrl));
  }

  private hasAnyPermission(
    user: any,
    requiredPermissions: string[],
    targetUrl: string
  ): boolean | UrlTree {
    const userPermissions = this.authService.getUserPermissions(user);

    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p)
    );

    if (hasPermission) {
      return true;
    }

    console.warn(
      `[PermissionGuard] Access denied. Required: ${requiredPermissions.join(' | ')}, URL: ${targetUrl}`
    );

    return this.router.createUrlTree(['/unauthorized']);
  }
}
