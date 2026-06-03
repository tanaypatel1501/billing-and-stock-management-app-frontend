import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Injectable({ providedIn: 'root' })
export class NoauthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (UserStorageService.hasToken() && !UserStorageService.isTokenExpired()) {
      if (UserStorageService.isUserLoggedIn()) return this.router.parseUrl('/user/dashboard');
      if (UserStorageService.isAdminLoggedIn()) return this.router.parseUrl('/admin/dashboard');
    }
    // Expired or no token — clear storage and allow through to login/register
    if (UserStorageService.hasToken()) UserStorageService.signOut();
    return true;
  }
}