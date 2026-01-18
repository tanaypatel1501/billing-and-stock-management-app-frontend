import { Component, OnInit } from '@angular/core';
import { UserActivityService } from './services/activity-check/user-activity.service';
import { UserStorageService } from './services/storage/user-storage.service';
import { AuthService } from './services/auth-service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'GST Medicose';
  constructor(private userActivityService: UserActivityService, private authService: AuthService) {}
  ngOnInit(): void {
    if (UserStorageService.isUserLoggedIn()) {
      this.scheduleActivityCheck();
    }
    this.authService.tokenRefreshed.subscribe(() => this.scheduleActivityCheck());
  }

  scheduleActivityCheck(): void {
    const expirationTime: any = UserStorageService.getTokenExpiration();
    const currentTime = new Date().getTime();
    if (!expirationTime || expirationTime <= currentTime) {
      return;
    }
    const timeUntilExpiration = expirationTime - currentTime;

    setTimeout(() => {
      this.userActivityService.startMonitoringActivity(this.scheduleActivityCheck.bind(this));
    }, timeUntilExpiration - 60000);
  }
}
