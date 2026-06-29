import { Component, OnInit, OnDestroy} from '@angular/core';
import { UserActivityService } from './services/activity-check/user-activity.service';
import { UserStorageService } from './services/storage/user-storage.service';
import { AuthService } from './services/auth-service/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  
  title = 'GST Medicose';
  
  private activityTimer: any;
  private refreshSubscription!: Subscription;
  
  constructor(private userActivityService: UserActivityService, private authService: AuthService) {}
  
  ngOnInit(): void {
    if (UserStorageService.isUserLoggedIn()) {
      this.scheduleActivityCheck();
    }
    this.refreshSubscription = this.authService.tokenRefreshed.subscribe(() => {
      this.scheduleActivityCheck();
    });
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
