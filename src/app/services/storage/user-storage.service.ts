import { Injectable } from '@angular/core';
import jwt_decode from 'jwt-decode';
import { Preferences } from '@capacitor/preferences';

const TOKEN = 'I_token';
const EXP_TIME = 'I_exp_time';
const BILL = 'I_bill';
const MOBILE_SESSION_TOKEN = 'I_mobile_session_token';

@Injectable({ providedIn: 'root' })
export class UserStorageService {
  productId: any;
  billId: any;

  constructor() {}

  public saveToken(token: string): void {
    window.localStorage.removeItem(TOKEN);
    window.localStorage.setItem(TOKEN, token);
  }

  public saveTokenExpiration(expirationTime: any): void {
    window.localStorage.removeItem(EXP_TIME);
    window.localStorage.setItem(EXP_TIME, expirationTime);
  }

  static getTokenExpiration() {
    return window.localStorage.getItem(EXP_TIME);
  }

  static hasToken() {
    return this.getToken() !== null;
  }

  static getToken() {
    return window.localStorage.getItem(TOKEN);
  }

  private static getDecodedToken(): any | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwt_decode(token);
    } catch {
      return null;
    }
  }

  static getUserId(): number | null {
    return this.getDecodedToken()?.userId ?? null;
  }

  static getUserRole(): string {
    return this.getDecodedToken()?.role ?? '';
  }

  static isUserLoggedIn(): boolean {
    if (!this.getToken()) return false;
    return this.getUserRole() === 'USER';
  }

  static isAdminLoggedIn(): boolean {
    if (!this.getToken()) return false;
    return this.getUserRole() === 'ADMIN';
  }

  static signOut(): void {
    window.localStorage.removeItem(TOKEN);
    window.localStorage.removeItem(EXP_TIME);
    window.localStorage.removeItem(BILL);
    Preferences.remove({ key: MOBILE_SESSION_TOKEN });
  }

  static isTokenExpired(): boolean {
    const token = UserStorageService.getToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  public saveProductId(productId: any) { this.productId = productId; }
  public getProductId() { return this.productId; }

  public saveBillId(billId: any) {
    this.billId = billId;
    try { window.localStorage.setItem(BILL, JSON.stringify(billId)); } catch (e) {}
  }

  public getBillId() {
    if (this.billId) return this.billId;
    try {
      const stored = window.localStorage.getItem(BILL);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return this.billId;
    }
  }

  static async saveMobileSessionToken(token: string): Promise<void> {
    await Preferences.set({ key: MOBILE_SESSION_TOKEN, value: token });
  }

  static async getMobileSessionToken(): Promise<string | null> {
    const result = await Preferences.get({ key: MOBILE_SESSION_TOKEN });
    return result.value;
  }

  static async clearMobileSessionToken(): Promise<void> {
    await Preferences.remove({ key: MOBILE_SESSION_TOKEN });
  }
}