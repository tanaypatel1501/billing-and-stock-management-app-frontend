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
  ): boolean {

    if (UserStorageService.hasToken() && UserStorageService.isUserLoggedIn()) {
      this.router.navigateByUrl("/user/dashboard")
      return false;
    } else if (UserStorageService.hasToken() && UserStorageService.isAdminLoggedIn()) {
      this.router.navigateByUrl("/admin/dashboard");
      return false;
    }
    return true;
  }


}



