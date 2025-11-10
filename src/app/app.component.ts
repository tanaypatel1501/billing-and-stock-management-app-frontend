import { Component, OnInit } from '@angular/core';
import { UserActivityService } from './services/activity-check/user-activity.service';
import { UserStorageService } from './services/storage/user-storage.service';
import { Router } from '@angular/router';
import { AuthService } from './services/auth-service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(private userActivityService: UserActivityService,private router: Router,private authService: AuthService) {}
  title = 'billing-and-stock-management-app';
  ngOnInit(): void {
    if (UserStorageService.isUserLoggedIn()) {
      this.scheduleActivityCheck();
    }
    this.authService.tokenRefreshed.subscribe(() => this.scheduleActivityCheck());
  }

  scheduleActivityCheck() {
    const expirationTime: any = UserStorageService.getTokenExpiration();
    const currentTime = new Date().getTime();
    const timeUntilExpiration = expirationTime - currentTime;

    if (timeUntilExpiration > 0) {
      setTimeout(() => {
        this.userActivityService.startMonitoringActivity(this.scheduleActivityCheck.bind(this));
      }, timeUntilExpiration - 60000);
    } else {
      alert("Session Expired!! Login Again");
      UserStorageService.signOut();
      this.router.navigateByUrl('login');
    }
  }
}
