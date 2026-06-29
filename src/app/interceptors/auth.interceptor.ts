import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service/auth.service';
import { AlertService } from '../services/alert-service/alert.service';

const PUBLIC_PATHS = ['/authenticate', '/sign-up', '/refresh-token', '/forgot-password', '/reset-password'];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const isPublicEndpoint = PUBLIC_PATHS.some(path => req.url.includes(path));

        if (!isPublicEndpoint && error.status === 401) {
          this.authService.signOut();
          this.alertService.error(
            'Your session has expired. Please log in again.',
            'Session Expired',
            0
          );
          this.router.navigateByUrl('/login');
        }

        if (!isPublicEndpoint && error.status === 403) {
          this.authService.signOut();
          this.alertService.error(
            "You don't have permission to do that. Please log in again.",
            'Access Denied',
            0
          );
          this.router.navigateByUrl('/login');
        }

        return throwError(() => error);
      })
    );
  }
}