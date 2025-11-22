import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router'; // <-- Import UrlTree
import { Observable } from 'rxjs';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Injectable({
  providedIn: 'root'
})

export class UserGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | (boolean | UrlTree) { 
        // Note the updated return type to handle Promise and UrlTree

    if (UserStorageService.isAdminLoggedIn()) {
      alert("ERROR: You don't have access to this page.");
      // Safer redirection: return a UrlTree
      return this.router.parseUrl('/admin/dashboard'); 
    } else if (!UserStorageService.hasToken()) {
      UserStorageService.signOut();
      alert("ERROR: You are not logged in. Please login first.");
      // Safer redirection: return a UrlTree
      return this.router.parseUrl('/login'); 
    }

    // THE FIX: Wrap the successful return in a resolved Promise.
    // This stabilizes the router's initial navigation state, fixing the blank screen.
    return Promise.resolve(true); 
  }
}