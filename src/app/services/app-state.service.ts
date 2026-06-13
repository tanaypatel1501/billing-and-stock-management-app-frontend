import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService, PageResponse } from './auth-service/auth.service';
import { UserStorageService } from './storage/user-storage.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  // true when details tab form is valid and complete
  private detailsValidSubject = new BehaviorSubject<boolean>(false);
  public detailsValid$: Observable<boolean> = this.detailsValidSubject.asObservable();
  private hasPurchasersSubject = new BehaviorSubject<boolean>(false);
  hasPurchasers$ = this.hasPurchasersSubject.asObservable();
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

  setHasPurchasers(value: boolean): void {
    this.hasPurchasersSubject.next(value);
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

  refreshHasPurchasers(userId: number): void {
    this.authService.getAllPurchasers(userId, { page: 0, size: 1, searchText: '' }).subscribe({
      next: (response: PageResponse<any>) => {
        this.setHasPurchasers(response.totalElements > 0);
      },
      error: () => this.setHasPurchasers(false)
    });
  }
}
