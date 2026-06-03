import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';

@Injectable({ providedIn: 'root' })
export class UserGuard implements CanActivate {
  constructor(private router: Router, private alertService: AlertService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | (boolean | UrlTree) {
    if (!UserStorageService.hasToken() || UserStorageService.isTokenExpired()) {
      UserStorageService.signOut();
      this.alertService.error(
        'Your session has expired. Please log in again.',
        'Session Expired',
        0
      );
      return this.router.parseUrl('/login');
    }
    return of(true);
  }
}