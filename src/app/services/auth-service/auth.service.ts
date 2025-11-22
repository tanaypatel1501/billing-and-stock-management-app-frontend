import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, EventEmitter } from '@angular/core';
import { Observable, catchError, map, tap } from 'rxjs';
import { UserStorageService } from '../storage/user-storage.service';
import { ConfigService } from '../config.service';
import jwt_decode from 'jwt-decode';

const AUTH_HEADER = 'authorization';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  tokenRefreshed = new EventEmitter<void>();
  static productId: any;

  constructor(
    private http: HttpClient,
    private userStorageService: UserStorageService,
    private configService: ConfigService   // <-- Injected correctly
  ) {}

  /** Safe getter — always resolves latest config.json value */
  private get baseUrl(): string {
    const url = this.configService.apiBaseUrl;
    if (!url) {
      console.error('❌ BASE_URL missing — config.json not loaded yet.');
    }
    return url || '';
  }

  login(username: string, password: string): any {
    return this.http
      .post<[]>(`${this.baseUrl}authenticate`, { username, password }, { observe: 'response' })
      .pipe(
        tap(() => console.log('User Authentication')),
        map((res: HttpResponse<any>) => {
          this.userStorageService.saveUser(res.body);

          const token = res.headers.get(AUTH_HEADER);
          const bearer = token ? token.substring(7) : '';

          this.userStorageService.saveToken(bearer);

          const decoded: any = jwt_decode(bearer);
          if (decoded?.exp) {
            const expirationTime = decoded.exp * 1000;
            this.userStorageService.saveTokenExpiration(expirationTime);
            this.tokenRefreshed.emit();
          }

          return res;
        })
      );
  }

  refreshToken(): any {
    return this.http
      .post(`${this.baseUrl}refresh-token`, null, {
        headers: this.createAuthorizationHeader(),
        observe: 'response'
      })
      .pipe(
        tap(res => console.log('Token refresh response:', res)),
        catchError(error => {
          console.error('Token refresh error:', error);
          throw error;
        })
      );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}sign-up`, data);
  }

  createAuthorizationHeader(): HttpHeaders {
    return new HttpHeaders().set(
      'Authorization',
      'Bearer ' + UserStorageService.getToken()
    );
  }

  // ------ PRODUCT ------
  addProduct(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/product/add`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getProducts(): Observable<any> {
    return this.http.get(`${this.baseUrl}api/product/all`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getProductById(productId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/product/${productId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  editProduct(productId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}api/product/edit/${productId}`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  deleteProduct(productId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}api/product/delete/${productId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  // ------ STOCK ------
  addStock(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/stock/add`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getStock(userId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/stock/user/${userId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  updateStock(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/stock/update`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  // ------ DETAILS ------
  addDetails(userId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/details/create/${userId}`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getDetailsByUserId(userId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/details/${userId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  editDetails(userId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}api/details/update/${userId}`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  deleteDetails(userId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}api/details/delete/${userId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  // ------ BILLING ------
  createBill(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/bill/add`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  addBillItem(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/bill_items/add`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getBillById(billId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/bill/${billId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getBills(userId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/bill/user/${userId}`,
      { headers: this.createAuthorizationHeader() }
    );
  }
}
