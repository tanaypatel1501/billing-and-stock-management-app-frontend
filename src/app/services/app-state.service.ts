import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth-service/auth.service';
import { UserStorageService } from './storage/user-storage.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  // true when details tab form is valid and complete
  private detailsValidSubject = new BehaviorSubject<boolean>(false);
  public detailsValid$: Observable<boolean> = this.detailsValidSubject.asObservable();
  constructor(private authService: AuthService) {
    // attempt to bootstrap details valid state if user is already logged in
    const uid = UserStorageService.getUserId();
    if (uid) {
      this.refreshDetailsValidity(uid);
    }
  }

  setDetailsValid(isValid: boolean) {
    this.detailsValidSubject.next(!!isValid);
  }

  getDetailsValidSnapshot(): boolean {
    return this.detailsValidSubject.getValue();
  }

  // Fetch details from server and set validity based on whether details exist and satisfy basic presence
  refreshDetailsValidity(userId: any) {
    if (!userId) { this.setDetailsValid(false); return; }
    this.authService.getDetailsByUserId(userId).subscribe(
      (details) => {
        if (!details) { this.setDetailsValid(false); return; }
        // quick server-side check: ensure required fields exist and are non-empty
        const required = ['name','addressLine1','addressLine2','state','city','pincode','phoneNumber'];
        const ok = required.every(k => details[k] !== undefined && details[k] !== null && String(details[k]).trim() !== '');
        this.setDetailsValid(!!ok);
      },
      () => { this.setDetailsValid(false); }
    );
  }
}
