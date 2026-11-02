import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { MobileSessionService } from 'src/app/services/mobile-session/mobile-session.service';

@Injectable({ providedIn: 'root' })
export class UserGuard implements CanActivate {

  constructor(
    private router: Router,
    private alertService: AlertService,
    private mobileSession: MobileSessionService
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {

    // Valid JWT, or successfully renewed JWT
    if (await this.mobileSession.ensureSession()) {
      return true;
    }

    // No recoverable session
    UserStorageService.signOut();

    this.alertService.error(
      'Your session has expired. Please log in again.',
      'Session Expired',
      0
    );

    return this.router.parseUrl('/login');
  }
}