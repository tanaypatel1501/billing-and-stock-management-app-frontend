import { Injectable } from '@angular/core';

const TOKEN = 'I_token';
const USER = 'I_user';
const EXP_TIME = 'I_exp_time';
const BILL = 'I_bill';

@Injectable({
  providedIn: 'root'
})
export class UserStorageService {  
  productId : any;
  billId : any;
  constructor() { }

  public saveToken(token: string): void {
    window.localStorage.removeItem(TOKEN);
    window.localStorage.setItem(TOKEN, token);
  }

  public saveTokenExpiration(expirationTime: any): void {
    window.localStorage.removeItem(EXP_TIME);
    window.localStorage.setItem(EXP_TIME,expirationTime);
  }

  public saveUser(user: any): void {
    window.localStorage.removeItem(USER);
    window.localStorage.setItem(USER, JSON.stringify(user));
  }

  static getTokenExpiration() {
    return window.localStorage.getItem(EXP_TIME);
  }

  static getUser() {
    const userString = window.localStorage.getItem(USER);
    return userString ? JSON.parse(userString) : null;
  }

  static getUserId() {
    const storedValue = window.localStorage.getItem(USER);
    const userObject = storedValue ? JSON.parse(storedValue) : null;
    return userObject ? userObject.userId : null;
  }

  static hasToken() {
    return this.getToken() !== null;
  }

  static getToken() {
    return window.localStorage.getItem(TOKEN);
  }

  static isUserLoggedIn(): boolean {
    if (!this.getToken()) {
      return false;
    }
    const role: string = this.getUserRole();
    console.log(role);
    return role === "USER";
  }

  static getUserRole(): string {
    const user = this.getUser();
    if (!user) {
      return "";
    }
    return user.role;
  }

  static isAdminLoggedIn(): boolean {
    if (!this.getToken()) {
      return false;
    }
    const role: string = this.getUserRole();
    return role === "ADMIN";
  }

  static signOut(): void {
    window.localStorage.removeItem(TOKEN);
    window.localStorage.removeItem(USER);
    window.localStorage.removeItem(EXP_TIME);
  }

  public saveProductId(productId :any){
    this.productId = productId;
  }

  public getProductId(){
    return this.productId;
  }

  public saveBillId(billId :any){
    this.billId = billId;
    try{
      window.localStorage.setItem(BILL, JSON.stringify(billId));
    }catch(e){
      // ignore storage errors
    }
  }

  public getBillId(){
    if (this.billId) {
      return this.billId;
    }
    try{
      const stored = window.localStorage.getItem(BILL);
      return stored ? JSON.parse(stored) : null;
    }catch(e){
      return this.billId;
    }
  }
}
