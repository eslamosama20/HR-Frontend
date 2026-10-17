import {HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {catchError} from 'rxjs/operators';
import {throwError} from 'rxjs';
// import { SecurityService } from './security.service';
import {AuthService} from '../modules/auth';

@Injectable({
  providedIn: 'root'
})
export class HttpRequestInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    var token = localStorage.getItem("authToken");
    
    // Debug logging
    console.log('=== HTTP INTERCEPTOR ===');
    console.log('Request URL:', req.url);
    const isPublicPage = typeof window !== 'undefined' && (
      window.location.pathname.includes('/self-order') ||
      window.location.pathname.startsWith('/public-') ||
      window.location.pathname.startsWith('/booking') ||
      window.location.pathname.startsWith('/hotel-') ||
      window.location.pathname.startsWith('/invoice') ||
      window.location.pathname.startsWith('/reservation')
    );

    if (token) {
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Try to decode and check expiration
      try {
        const payload = this.authService.decodeJwtPayload(token.split('.')[1]);
        const exp = payload?.exp;
        if (!isPublicPage && typeof exp === 'number' && Number.isFinite(exp) && exp * 1000 <= Date.now()) {
          console.warn('⚠️ TOKEN EXPIRED! Auto-logout...');
          this.authService.logout();
          return next.handle(req);
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
    
    if (token != null) {

      const clonedReq = req.clone({
        headers: req.headers
          .set('Authorization', `Bearer ${token}`)
      });

      return next.handle(clonedReq)
        .pipe(catchError(err => {
          // Log error details for debugging
          console.log('=== HTTP INTERCEPTOR ERROR ===');
          console.log('Status:', err.status);
          
          if (isPublicPage) {
            // Public customer pages (e.g. self-order) must never be redirected to login
            return throwError(() => err);
          }

          // Only logout on 401 (unauthorized) or 403 without session guard error codes
          // Don't logout for cashier session guard errors (user is authenticated but no active session)
          const isCashierSessionError = err.error?.errorCode === 'NO_ACTIVE_SESSION' || 
                                        err.error?.errorCode === 'SESSION_NO_STORE';
          
          // Don't auto-logout on background requests (notifications, system settings)
          const isBackgroundRequest = req.url.includes('/api/UserNotifications/') || 
                                      req.url.includes('/api/systemSetting');
          const isCashierEndpoint = req.url.includes('/api/cashier/');
          
          if (err.status === 401 && !isCashierEndpoint && !isBackgroundRequest) {
            console.log('401 detected (interactive request) - logging out');
            this.authService.logout();
          } else if (err.status === 401 && isCashierEndpoint) {
            console.warn('⚠️ 401 on cashier endpoint');
            if (typeof window !== 'undefined' && !localStorage.getItem('authToken')) {
              window.location.href = '/auth/login';
            }
          } else if (err.status === 401 && isBackgroundRequest) {
            // Just log background request failures, don't logout
            console.log('401 on background request - ignoring');
          } else {
            console.log('Error handled without logout');
          }

          // Log the full error for debugging
          console.error(err);
          
          // Return the full error object instead of just a string
          // This preserves validation errors and other details
          return throwError(() => err);
        }))
    } else {

      return next.handle(req.clone());
    }


  }
}
