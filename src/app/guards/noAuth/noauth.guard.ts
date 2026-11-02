import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { MobileSessionService } from 'src/app/services/mobile-session/mobile-session.service';

@Injectable({ providedIn: 'root' })
export class NoauthGuard implements CanActivate {

  constructor(
    private router: Router,
    private mobileSession: MobileSessionService
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {

    // Valid JWT, or successfully renewed JWT
    if (await this.mobileSession.ensureSession()) {

      if (UserStorageService.isUserLoggedIn()) {
        return this.router.parseUrl('/user/dashboard');
      }

      if (UserStorageService.isAdminLoggedIn()) {
        return this.router.parseUrl('/admin/dashboard');
      }
    }

    // Only clear storage when there is no recoverable session.
    if (UserStorageService.hasToken()) {
      UserStorageService.signOut();
    }

    return true;
  }
}