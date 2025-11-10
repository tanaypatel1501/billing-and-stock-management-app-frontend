import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from '../storage/user-storage.service';
import jwt_decode from 'jwt-decode';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserActivityService {
  private callback: Function | null = null;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) {}

  startMonitoringActivity(callback: Function): void {
    this.callback = callback;
    window.addEventListener('keypress', this.handleUserActivity);
    window.addEventListener('click', this.handleUserActivity);
    window.addEventListener('scroll', this.handleUserActivity);
    window.addEventListener('mousemove', this.handleUserActivity);     
  }

  stopMonitoringActivity(): void {
    window.removeEventListener('keypress', this.handleUserActivity);
    window.removeEventListener('click', this.handleUserActivity);
    window.removeEventListener('scroll', this.handleUserActivity);
    window.removeEventListener('mousemove', this.handleUserActivity);
  }

  private handleUserActivity = () => {
    this.stopMonitoringActivity();
    this.refreshTokenIfLoggedIn();
  }

  private refreshTokenIfLoggedIn(): void {
    if (UserStorageService.isUserLoggedIn() || (UserStorageService.isAdminLoggedIn())){
      this.authService.refreshToken().subscribe(
        (response: any) => {
          const token = response.headers.get('authorization');
          const bearerToken = token ? token.substring(7) : '';
          if (bearerToken) {
            this.userStorageService.saveToken(bearerToken);
            const decodedToken : any = jwt_decode(bearerToken);
            if (decodedToken && decodedToken.exp) {
              const expirationTime = (new Date(decodedToken.exp * 1000)).getTime();
              this.userStorageService.saveTokenExpiration(expirationTime);
              if (this.callback) {
                this.callback();
              }
            }
          }
        },
        (error: any) => {
          console.error('Token refresh failed:', error);
          alert("Session Expired!! Login Again");
          UserStorageService.signOut();
          this.router.navigateByUrl('login');
        }
      );
    }
  }
}
