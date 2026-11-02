import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class NativeHomeGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (Capacitor.isNativePlatform()) {
      return this.router.parseUrl('/login');
    }
    return true;
  }
}