import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router'; // <-- Added UrlTree
import { Observable } from 'rxjs';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  // Removed the unused userStorageService dependency from the constructor
  constructor(private router: Router) { } 

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | (boolean | UrlTree) { 
        // Updated return type to include UrlTree for safe redirection

    // Logic 1: If a standard user is logged in, redirect them away from the admin page
    if (UserStorageService.isUserLoggedIn()) {
      alert("ERROR: You don't have access to this page.");
      // FIX: Use UrlTree for safe redirection
      return this.router.parseUrl('/user/dashboard'); 
    } 
    
    // Logic 2: If no token exists (logged out), redirect to login
    else if (!UserStorageService.hasToken()) {
      UserStorageService.signOut();
      alert("ERROR: You are not logged in. Please login first.");
      // FIX: Use UrlTree for safe redirection
      return this.router.parseUrl('/login');
    }

    // THE BLANK SCREEN FIX: Return a resolved Promise instead of raw true.
    // This ensures the router stabilizes before completing the navigation.
    return Promise.resolve(true); 
  }
}