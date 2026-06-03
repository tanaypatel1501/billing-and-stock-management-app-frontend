import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
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
    if (UserStorageService.isUserLoggedIn()) {
      this.alertService.error(
        "You don't have access to this page.",
        'Access Denied',
        4000
      );
      return this.router.parseUrl('/user/dashboard');
    }
    return Promise.resolve(true);
  }
}