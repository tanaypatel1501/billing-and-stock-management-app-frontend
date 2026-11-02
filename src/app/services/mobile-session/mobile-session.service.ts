import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import jwt_decode from 'jwt-decode';
import { UserStorageService } from '../storage/user-storage.service';
import { ConfigService } from '../config.service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs'

const AUTH_HEADER = 'authorization';
export type RenewResult = 'renewed' | 'rejected' | 'error';

@Injectable({ providedIn: 'root' })
export class MobileSessionService {
  private listening = false;
  
  private renewalPromise: Promise<RenewResult> | null = null;
  readonly renewed$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private userStorageService: UserStorageService
  ) {}

  private get baseUrl(): string {
    return this.configService.apiBaseUrl || '';
  }

  start(): void {
    if (!Capacitor.isNativePlatform() || this.listening) {
      return;
    }

    this.listening = true;

    App.addListener('resume', () => {
      this.renewIfNeeded();
    });

    this.renewIfNeeded();
  }

  async renewSession(): Promise<RenewResult> {
    if (!Capacitor.isNativePlatform()) return 'rejected';
    if (this.renewalPromise) return this.renewalPromise;

    this.renewalPromise = this.performRenewal();
    try {
      return await this.renewalPromise;
    } finally {
      this.renewalPromise = null;
    }
  }

  async ensureSession(): Promise<boolean> {
    if (UserStorageService.hasToken() && !UserStorageService.isTokenExpired()) {
      return true;
    }
    if (!Capacitor.isNativePlatform()) return false;

    const result = await this.renewSession();
    if (result === 'renewed') return true;
    // offline/transient: keep the stale JWT and let the interceptor retry later
    if (result === 'error') return UserStorageService.hasToken();
    return false; // 'rejected' or no mobile token: session really is gone
  }

  async renewNow(): Promise<boolean> {
    return (await this.renewSession()) === 'renewed';
  }

  private async performRenewal(): Promise<RenewResult> {
    const mobileSessionToken = await UserStorageService.getMobileSessionToken();
    if (!mobileSessionToken) return 'rejected'; // nothing to renew with

    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}mobile-session/renew`,
          { mobileSessionToken }, { observe: 'response' })
      );

      const header = res.headers.get(AUTH_HEADER);
      if (!header?.startsWith('Bearer ')) return 'error';

      const bearer = header.substring(7);
      const decoded: any = jwt_decode(bearer);
      if (!decoded?.exp) return 'error';

      this.userStorageService.saveToken(bearer);
      this.userStorageService.saveTokenExpiration(decoded.exp * 1000);
      this.renewed$.next();
      return 'renewed';
    } catch (e) {
      const status = (e as HttpErrorResponse)?.status;
      // Only an explicit rejection means the session is truly gone
      return status === 401 || status === 403 ? 'rejected' : 'error';
    }
  }

  private async renewIfNeeded(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!UserStorageService.isTokenExpired()) {
      return;
    }

    const mobileSessionToken =
      await UserStorageService.getMobileSessionToken();

    if (!mobileSessionToken) {
      return;
    }

    await this.renewNow();
  }
}