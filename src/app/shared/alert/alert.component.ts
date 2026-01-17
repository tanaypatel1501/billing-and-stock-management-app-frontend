import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertService, AlertMessage } from '../../services/alert-service/alert.service';
import { 
  faCheckCircle, 
  faExclamationCircle, 
  faExclamationTriangle, 
  faInfoCircle 
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css']
})
export class AlertComponent implements OnInit, OnDestroy {
  alert: AlertMessage | null = null;
  dismissTimeout: any;
  private sub!: Subscription;

  // Icons
  faCheckCircle = faCheckCircle;
  faExclamationCircle = faExclamationCircle;
  faExclamationTriangle = faExclamationTriangle;
  faInfoCircle = faInfoCircle;

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
          this.close();
        }, alert.duration);
      }
    });
  }

  getIcon() {
    if (!this.alert) return this.faInfoCircle;
    
    switch (this.alert.type) {
      case 'success':
        return this.faCheckCircle;
      case 'error':
        return this.faExclamationCircle;
      case 'warning':
        return this.faExclamationTriangle;
      case 'info':
      default:
        return this.faInfoCircle;
    }
  }

  close(): void {
    const currentAlert = this.alert;
    this.alert = null;
    
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }

    // Execute onClose callback if it exists
    if (currentAlert?.onClose) {
      currentAlert.onClose();
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
  }
}