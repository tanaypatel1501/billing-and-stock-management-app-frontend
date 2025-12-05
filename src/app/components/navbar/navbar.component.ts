import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service'; // <-- Inject this
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { Observable, Subscription } from 'rxjs';
import { AppStateService } from 'src/app/services/app-state.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy { // <-- Implement OnInit for initialization
  
  // Public observables that the template will use with the 'async' pipe
  isAuthenticated$!: Observable<boolean>;
  // whether details tab is valid
  detailsValid$!: Observable<boolean>;
  // local snapshot used for template binding to avoid async pipe timing issues
  detailsValid = false;
  detailsSub?: Subscription;
  authSub?: Subscription;
  errorMessage: string | null = null;

  constructor(private router: Router, private authService: AuthService, private appState: AppStateService) { // <-- Inject AuthService
    // Note: UserStorageService is not directly injected here as the logic is now in AuthService
  }

  ngOnInit() {
    // 1. Initialize the observable from the service
    this.isAuthenticated$ = this.authService.isAuthenticated$;

    // 2. Call the update to ensure the observable has the correct initial state from local storage
    // (This is often redundant due to APP_INITIALIZER, but safe to keep)
    this.authService.updateNavBar(); 
    // expose details validity observable and subscribe to keep a local snapshot
    this.detailsValid$ = this.appState.detailsValid$;
    this.detailsSub = this.detailsValid$.subscribe(v => {
      this.detailsValid = !!v;
      if (this.detailsValid) this.errorMessage = null;
    });

    // ensure we have an up-to-date server-side validity when a user has just logged in
    const uid = UserStorageService.getUserId();
    if (uid) {
      this.appState.refreshDetailsValidity(uid);
    }

    // Also listen for authentication changes (login) and refresh details validity when a user logs in
    this.authSub = this.isAuthenticated$.subscribe(auth => {
      if (auth) {
        const id = UserStorageService.getUserId();
        if (id) this.appState.refreshDetailsValidity(id);
      }
    });
    
    // 3. Remove the synchronous check and router event subscription, as the Observable handles reactivity.
  }

  ngOnDestroy(): void {
    if (this.detailsSub) this.detailsSub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
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

  onCreateBill(event: Event) {
    // prevent default navigation; we'll navigate programmatically if allowed
    event.preventDefault();
    if (!this.detailsValid) {
      this.errorMessage = 'Please update all details in Details Tab in order to create a bill';
      setTimeout(() => { this.errorMessage = null; }, 5000);
      return;
    }
    // allowed — navigate to create bill
    this.router.navigateByUrl('/user/create-bill');
  }
}