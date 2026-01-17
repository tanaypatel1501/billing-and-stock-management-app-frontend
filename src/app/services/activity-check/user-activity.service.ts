import { Injectable, OnDestroy } from '@angular/core';
import { AuthService } from '../auth-service/auth.service';
import { UserStorageService } from '../storage/user-storage.service';
import jwt_decode from 'jwt-decode';
import { Router } from '@angular/router';
import { AlertService } from '../alert-service/alert.service';

@Injectable({
  providedIn: 'root'
})
export class UserActivityService implements OnDestroy {
  private callback: Function | null = null;
  private monitoringActive = false;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private alertService: AlertService
  ) {}

  startMonitoringActivity(callback: Function): void {
    if (this.monitoringActive) {
      return;
    }

    this.callback = callback;
    this.monitoringActive = true;

    window.addEventListener('keypress', this.handleUserActivity);
    window.addEventListener('click', this.handleUserActivity);
    window.addEventListener('scroll', this.handleUserActivity);
    window.addEventListener('mousemove', this.handleUserActivity);
  }

  stopMonitoringActivity(): void {
    if (!this.monitoringActive) {
      return;
    }

    window.removeEventListener('keypress', this.handleUserActivity);
    window.removeEventListener('click', this.handleUserActivity);
    window.removeEventListener('scroll', this.handleUserActivity);
    window.removeEventListener('mousemove', this.handleUserActivity);

    this.monitoringActive = false;
  }

  private handleUserActivity = () => {
    this.stopMonitoringActivity();
    this.refreshTokenIfLoggedIn();
  }

  private refreshTokenIfLoggedIn(): void {
    if (
      !UserStorageService.isUserLoggedIn() &&
      !UserStorageService.isAdminLoggedIn()
    ) {
      return;
    }

    this.authService.refreshToken().subscribe({
      next: (response: any) => {
        const tokenHeader = response.headers.get('authorization');
        const bearerToken = tokenHeader ? tokenHeader.substring(7) : null;

        if (!bearerToken) {
          this.forceLogout();
          return;
        }

        this.userStorageService.saveToken(bearerToken);

        const decoded: any = jwt_decode(bearerToken);
        if (decoded?.exp) {
          const expirationTime = decoded.exp * 1000;
          this.userStorageService.saveTokenExpiration(expirationTime);
        }

        // Restart monitoring cycle if needed
        if (this.callback) {
          this.callback();
        }
      },
      error: () => {
        this.forceLogout();
      }
    });
  }

  private forceLogout(): void {
    this.stopMonitoringActivity();
    this.authService.signOut();

    this.alertService.error(
      'Your session has expired. Please log in again.',
      'Session Expired',
      0
    );

    this.router.navigateByUrl('login');
  }

  ngOnDestroy(): void {
    this.stopMonitoringActivity();
  }  
}