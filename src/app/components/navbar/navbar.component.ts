import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service'; // <-- Inject this
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { Observable, Subscription } from 'rxjs';
import { AppStateService } from 'src/app/services/app-state.service';
import { 
  faUserPlus, 
  faSignInAlt, 
  faSignOutAlt, 
  faUser, 
  faChartLine, 
  faBoxOpen, 
  faBoxes, 
  faFileInvoice, 
  faMoneyBillWave, 
  faBuilding 
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy { 
  isAuthenticated$!: Observable<boolean>;
  detailsValid$!: Observable<boolean>;
  detailsValid = false;
  detailsSub?: Subscription;
  authSub?: Subscription;
  errorMessage: string | null = null;
  mobileMenuOpen: boolean = false;
  faUserPlus = faUserPlus;
  faSignInAlt = faSignInAlt;
  faSignOutAlt = faSignOutAlt;
  faUser = faUser;
  faChartLine = faChartLine;
  faBoxOpen = faBoxOpen;
  faBoxes = faBoxes;
  faFileInvoice = faFileInvoice;
  faMoneyBillWave = faMoneyBillWave;
  faBuilding = faBuilding;

  constructor(private router: Router, private authService: AuthService, private appState: AppStateService) { // <-- Inject AuthService
    
  }

  ngOnInit() {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.authService.updateNavBar(); 
    this.detailsValid$ = this.appState.detailsValid$;
    this.detailsSub = this.detailsValid$.subscribe(v => {
      this.detailsValid = !!v;
      if (this.detailsValid) this.errorMessage = null;
    });

    const uid = UserStorageService.getUserId();
    if (uid) {
      this.appState.refreshDetailsValidity(uid);
    }

    this.authSub = this.isAuthenticated$.subscribe(auth => {
      if (auth) {
        const id = UserStorageService.getUserId();
        if (id) this.appState.refreshDetailsValidity(id);
      }
    });
    
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
    this.closeMobileMenu();
    this.authService.signOut(); 
    this.router.navigateByUrl('login');
  }
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
  onCreateBill(event: Event) {
    this.closeMobileMenu();
    if (!this.detailsValid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.errorMessage = 'Please update all details in Details Tab in order to create a bill';
      setTimeout(() => { this.errorMessage = null; }, 5000);
      return;
    }
    // allowed — navigate to create bill
    this.router.navigateByUrl('/user/create-bill');
  }
}