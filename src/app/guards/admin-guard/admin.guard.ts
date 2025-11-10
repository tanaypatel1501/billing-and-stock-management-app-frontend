import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private router: Router,userStorageService: UserStorageService) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    if (UserStorageService.isUserLoggedIn()) {
      this.router.navigateByUrl('/user/dashboard');
      alert("ERROR: You don't have access to this page.");
      return false;
    } else if (!UserStorageService.hasToken()) {
      UserStorageService.signOut();
      this.router.navigateByUrl('/login');
      alert("ERROR: You are not logged in. Please login first.");
      return false;
    }

    return true;
  }
}
