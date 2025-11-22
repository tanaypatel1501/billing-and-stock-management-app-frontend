import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Route, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Injectable({
  providedIn: 'root'
})
export class NoauthGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree { // Updated return type

    if (UserStorageService.hasToken() && UserStorageService.isUserLoggedIn()) {
      // Redirect to user dashboard if logged in
      return this.router.parseUrl("/user/dashboard");
    } else if (UserStorageService.hasToken() && UserStorageService.isAdminLoggedIn()) {
      // Redirect to admin dashboard if logged in
      return this.router.parseUrl("/admin/dashboard");
    }
    return true;
  }
}