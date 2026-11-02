import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service/auth.service';
import { UserStorageService } from '../storage/user-storage.service';
import { AlertService } from '../alert-service/alert.service';
import { MobileSessionService } from '../mobile-session/mobile-session.service';

@Injectable({ providedIn: 'root' })
export class UserActivityService implements OnDestroy {
  private callback: Function | null = null;
  private monitoringActive = false;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private alertService: AlertService,
    private mobileSessionService: MobileSessionService
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
    window.addEventListener(
      'touchstart',
      this.handleUserActivity,
      { passive: true }
    );
    window.addEventListener(
      'touchmove',
      this.handleUserActivity,
      { passive: true }
    );
    window.addEventListener(
      'touchend',
      this.handleUserActivity,
      { passive: true }
    );
  }

  stopMonitoringActivity(): void {
    if (!this.monitoringActive) {
      return;
    }

    window.removeEventListener(
      'keypress',
      this.handleUserActivity
    );
    window.removeEventListener(
      'click',
      this.handleUserActivity
    );
    window.removeEventListener(
      'scroll',
      this.handleUserActivity
    );
    window.removeEventListener(
      'mousemove',
      this.handleUserActivity
    );
    window.removeEventListener(
      'touchstart',
      this.handleUserActivity
    );
    window.removeEventListener(
      'touchmove',
      this.handleUserActivity
    );
    window.removeEventListener(
      'touchend',
      this.handleUserActivity
    );

    this.monitoringActive = false;
  }

  private handleUserActivity = (): void => {
    this.stopMonitoringActivity();
    this.refreshTokenIfLoggedIn();
  };

  private async refreshTokenIfLoggedIn(): Promise<void> {
    if (
      !UserStorageService.isUserLoggedIn() &&
      !UserStorageService.isAdminLoggedIn()
    ) {
      return;
    }

    this.authService.refreshToken().subscribe({
      next: () => {
        if (this.callback) {
          this.callback();
        }
      },

      error: async () => {
        const result = await this.mobileSessionService.renewSession();

        if (result === 'renewed') {
          this.authService.updateNavBar();
        }
        if (result === 'renewed' || result === 'error') {
          // 'error' = offline/transient: stay logged in, and re-arm monitoring
          // (handleUserActivity stops monitoring, so skipping the callback
          // would leave activity tracking dead)
          this.callback?.();
          return;
        }
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

    this.router.navigateByUrl('/login');
  }

  ngOnDestroy(): void {
    this.stopMonitoringActivity();
  }
}