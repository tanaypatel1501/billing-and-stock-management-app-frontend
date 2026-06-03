import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserStorageService } from '../services/storage/user-storage.service';
import { AlertService } from '../services/alert-service/alert.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private alertService: AlertService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          UserStorageService.signOut();
          this.alertService.error(
            'Your session has expired. Please log in again.',
            'Session Expired',
            0
          );
          this.router.navigateByUrl('/login');
        }
        return throwError(() => error);
      })
    );
  }
}