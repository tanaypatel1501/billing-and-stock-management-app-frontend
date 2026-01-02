import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertService, AlertMessage } from '../../services/alert-service/alert.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html'
})
export class AlertComponent implements OnInit, OnDestroy {
  alert: AlertMessage | null = null;
  dismissTimeout: any;
  private sub!: Subscription;

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
     const pending = this.alertService.consumePendingAlert();
    if (pending) {
      this.alert = pending;
    }
    this.sub = this.alertService.alert$.subscribe(alert => {
      this.alert = alert;

      // Clear previous timer
      if (this.dismissTimeout) {
        clearTimeout(this.dismissTimeout);
      }

      // Auto-dismiss only if duration > 0
      if (alert.duration && alert.duration > 0) {
        this.dismissTimeout = setTimeout(() => {
          this.alert = null;
        }, alert.duration);
      }
    });
  }

  close(): void {
    this.alert = null;
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}