import { Injectable, Injector } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpContextToken
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service/auth.service';
import { AlertService } from '../services/alert-service/alert.service';
import { MobileSessionService } from '../services/mobile-session/mobile-session.service';
import { UserStorageService } from '../services/storage/user-storage.service';
import { Capacitor } from '@capacitor/core';

const AUTH_EXEMPT_PATHS = [
  '/authenticate',
  '/sign-up',
  '/refresh-token',
  '/mobile-session/renew',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/resend-verification',
  '/auth/google',
  '/logout'            // a failing logout must NEVER trigger another logout (this was the infinite loop)
];

// Spring's default logout answers with a redirect to /login?logout, which the browser follows
// and which then fails with 403. The error then carries that redirected URL, not /logout.
const LOGOUT_REDIRECT = /\/login(\?|$)/;

const MOBILE_RETRY = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  /** True while a sign-out is being handled, so parallel failing requests don't alert/log out repeatedly. */
  private handlingFailure = false;

  constructor(
    private router: Router,
    private alertService: AlertService,
    private injector: Injector
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const failedUrl = error.url ?? '';
        const isAuthExemptEndpoint =
          AUTH_EXEMPT_PATHS.some(path => req.url.includes(path) || failedUrl.includes(path)) ||
          LOGOUT_REDIRECT.test(failedUrl);

        if (
          isAuthExemptEndpoint ||
          (error.status !== 401 && error.status !== 403)
        ) {
          return throwError(() => error);
        }

        if (
          Capacitor.isNativePlatform() &&
          !req.context.get(MOBILE_RETRY)
        ) {
          const mobileSessionService =
            this.injector.get(MobileSessionService);

          return from(mobileSessionService.renewSession()).pipe(
            switchMap(result => {
              if (result === 'rejected') {
                this.handleAuthenticationFailure(error);
                return throwError(() => error);
              }
              if (result === 'error') {
                // transient: keep the session, let this request fail
                return throwError(() => error);
              }

              const newToken = UserStorageService.getToken();
              if (!newToken) {
                this.handleAuthenticationFailure(error);
                return throwError(() => error);
              }

              const retryRequest = req.clone({
                context: req.context.set(MOBILE_RETRY, true),
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });

              return next.handle(retryRequest).pipe(
                catchError((retryError: HttpErrorResponse) => {
                  // a 403 on a fresh token is a permission error, not an expired session
                  if (retryError.status === 401) {
                    this.handleAuthenticationFailure(retryError);
                  }
                  return throwError(() => retryError);
                })
              );
            })
          );
        }

        this.handleAuthenticationFailure(error);
        return throwError(() => error);
      })
    );
  }

  private handleAuthenticationFailure(error: HttpErrorResponse): void {
    // Several requests can fail at once (e.g. the dashboard's parallel calls). Handle the first only.
    if (this.handlingFailure) return;
    this.handlingFailure = true;
    setTimeout(() => (this.handlingFailure = false), 2000);

    const authService = this.injector.get(AuthService);
    authService.signOut();

    if (error.status === 401) {
      this.alertService.error(
        'Your session has expired. Please log in again.',
        'Session Expired',
        0
      );
    } else {
      this.alertService.error(
        "You don't have permission to do that. Please log in again.",
        'Access Denied',
        0
      );
    }

    this.router.navigateByUrl('/login');
  }
}