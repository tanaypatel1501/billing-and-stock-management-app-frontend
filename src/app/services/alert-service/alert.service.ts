import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AlertMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; 
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertSubject = new Subject<AlertMessage>();
  private pendingAlert: AlertMessage | null = null;
  alert$ = this.alertSubject.asObservable();

  show(alert: AlertMessage) {
    this.pendingAlert = alert;
    this.alertSubject.next(alert);
  }
  consumePendingAlert(): AlertMessage | null {
    const alert = this.pendingAlert;
    this.pendingAlert = null;
    return alert;
  }

   success(message: string, title = 'Success', duration = 4000) {
    this.show({ type: 'success', title, message, duration });
  }

  error(message: string, title = 'Error', duration = 4000) {
    this.show({ type: 'error', title, message, duration });
  }

  warning(message: string, title = 'Warning', duration = 5000) {
    this.show({ type: 'warning', title, message, duration });
  }

  info(message: string, title = 'Info', duration = 4000) {
    this.show({ type: 'info', title, message, duration });
  }
}
