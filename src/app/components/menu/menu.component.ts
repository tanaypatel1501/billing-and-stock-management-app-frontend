import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import {
  faClockRotateLeft,
  faMoneyBillWave,
  faUsers,
  faChartBar,
  faBuilding,
  faGear,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, OnDestroy {
  faClockRotateLeft = faClockRotateLeft;
  faMoneyBillWave = faMoneyBillWave;
  faUsers = faUsers;
  faChartBar = faChartBar;
  faBuilding = faBuilding;
  faGear = faGear;
  faChevronRight = faChevronRight;

  hasPurchasers = false;
  detailsValid = false;
  private subs = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private appState: AppStateService,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.appState.hasPurchasers$.subscribe(v => (this.hasPurchasers = !!v)));
    this.subs.add(this.appState.detailsValid$.subscribe(v => (this.detailsValid = !!v)));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get isAdmin(): boolean {
    return UserStorageService.isAdminLoggedIn();
  }

  get isUser(): boolean {
    return UserStorageService.isUserLoggedIn() && !UserStorageService.isAdminLoggedIn();
  }

  logout(): void {
    this.authService.signOut();
    this.router.navigateByUrl('login');
  }
}