import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service'; // <-- Inject this
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit { // <-- Implement OnInit for initialization
  
  // Public observables that the template will use with the 'async' pipe
  isAuthenticated$!: Observable<boolean>;

  constructor(private router: Router, private authService: AuthService) { // <-- Inject AuthService
    // Note: UserStorageService is not directly injected here as the logic is now in AuthService
  }

  ngOnInit() {
    // 1. Initialize the observable from the service
    this.isAuthenticated$ = this.authService.isAuthenticated$;

    // 2. Call the update to ensure the observable has the correct initial state from local storage
    // (This is often redundant due to APP_INITIALIZER, but safe to keep)
    this.authService.updateNavBar(); 
    
    // 3. Remove the synchronous check and router event subscription, as the Observable handles reactivity.
  }

  // These getters are synchronous checks used only to determine role for specific links
  // The 'async' pipe on isAuthenticated$ handles the main login/logout display switch.
  get isUserLoggedIn(): boolean {
    return UserStorageService.isUserLoggedIn();
  }

  get isAdminLoggedIn(): boolean {
    return UserStorageService.isAdminLoggedIn();
  }

  logout() {
    // CRITICAL: Call the signOut method on AuthService, which now also updates the BehaviorSubject
    this.authService.signOut(); 
    this.router.navigateByUrl('login');
  }
}