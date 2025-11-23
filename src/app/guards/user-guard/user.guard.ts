import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs'; // <-- IMPORT 'of' from 'rxjs'
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

//     if (UserStorageService.isAdminLoggedIn()) {
//       alert("ERROR: You don't have access to this page.");
//       return this.router.parseUrl('/admin/dashboard'); 
//     } else 
    if (!UserStorageService.hasToken()) {
      UserStorageService.signOut();
      alert("ERROR: You are not logged in. Please login first.");
      return this.router.parseUrl('/login'); 
    }

    // THE ULTIMATE FIX: Return an Observable that immediately emits 'true'.
    // This stabilizes the navigation context for the primary deep-link navigation.
    return of(true); 
  }
}