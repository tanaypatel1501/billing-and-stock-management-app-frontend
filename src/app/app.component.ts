import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { UserActivityService } from './services/activity-check/user-activity.service';
import { UserStorageService } from './services/storage/user-storage.service';
import { AuthService } from './services/auth-service/auth.service';
import { AlertService } from './services/alert-service/alert.service';
import { Subscription } from 'rxjs';
import { MobileSessionService } from './services/mobile-session/mobile-session.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { NgZone } from '@angular/core';

const EXIT_CONFIRM_ROOT_ROUTES = ['/login', '/user/dashboard', '/admin/dashboard'];
const EXIT_PRESS_WINDOW_MS = 2000;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'GST Medicose';
  private activityTimer: any;
  private refreshSubscription!: Subscription;
  private currentUrl = '';
  private lastBackPressTime = 0;

  constructor(
    private userActivityService: UserActivityService,
    private authService: AuthService,
    private mobileSessionService: MobileSessionService,
    private router: Router,
    private location: Location,
    private alertService: AlertService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (UserStorageService.isUserLoggedIn()) {
      this.scheduleActivityCheck();
    }
    this.refreshSubscription = this.authService.tokenRefreshed.subscribe(() => {
      this.scheduleActivityCheck();
    });
    this.refreshSubscription.add(
      this.mobileSessionService.renewed$.subscribe(() => this.scheduleActivityCheck())
    );
    this.mobileSessionService.start();
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
      }
    });

    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        this.ngZone.run(() => {
          this.handleBackButton();
        });
      });
    }
  }

  private handleBackButton(): void {
    console.log('Back pressed. currentUrl:', this.currentUrl);
    const isRootRoute = EXIT_CONFIRM_ROOT_ROUTES.includes(this.currentUrl);
    console.log('isRootRoute:', isRootRoute);

    if (!isRootRoute) {
      this.location.back();
      return;
    }

    const now = Date.now();
    if (now - this.lastBackPressTime < EXIT_PRESS_WINDOW_MS) {
      App.exitApp();
      return;
    }

    this.lastBackPressTime = now;
    this.alertService.show({
      type: 'info',
      message: 'Press back again to exit',
      duration: 2000,
      showButtons: false
    });
  }

  ngAfterViewInit(): void {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide();
    }
  }

  ngOnDestroy(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    this.refreshSubscription?.unsubscribe();
  }

  scheduleActivityCheck(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    const expirationTime = Number(UserStorageService.getTokenExpiration());
    const currentTime = Date.now();
    if (!expirationTime || expirationTime <= currentTime) {
      return;
    }
    const timeUntilExpiration = expirationTime - currentTime;

    const delay = Math.max(0, timeUntilExpiration - 60000);

    this.activityTimer = setTimeout(() => {
      this.userActivityService.startMonitoringActivity(
        this.scheduleActivityCheck.bind(this)
      );
    }, delay);
  }
}