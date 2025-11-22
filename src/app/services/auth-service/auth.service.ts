import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, EventEmitter } from '@angular/core';
import { Observable, catchError, map, tap,  BehaviorSubject } from 'rxjs';
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

  // NEW: State for Navbar visibility
  private isUserLoggedIn$ = new BehaviorSubject<boolean>(UserStorageService.hasToken());
  // Expose the state as a public observable for the Navbar component to subscribe to
  public isAuthenticated$: Observable<boolean> = this.isUserLoggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    private userStorageService: UserStorageService,
    private configService: ConfigService   // <-- Injected correctly
  ) {}

  /** Safe getter — always resolves latest config.json value */
  private get baseUrl(): string {
    const url = this.configService.apiBaseUrl;
    if (!url) {
      console.error('❌ BASE_URL missing — config.json not loaded yet.');
    }
    return url || '';
  }
  
  /**
   * FIX for blank screen on reload (App Initializer).
   * This method forces Angular to wait while the application confirms
   * the initial authentication state (i.e., checks local storage).
   */
  initializeAuth(): Promise<void> {
    return new Promise((resolve) => {
      // Since UserStorageService methods are likely synchronous (reading localStorage),
      // we execute the token check here. The critical part is that this Promise
      // forces Angular to pause App initialization until this function resolves.
      const token = UserStorageService.getToken(); 
      if (token) {
        // Optional: Add logic here if you want to perform a synchronous token validity check
      }
      
      resolve(); // RESOLVE is critical: it tells Angular it's safe to proceed with routing.
    });
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
          this.updateNavBar();

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
  // NEW: Helper method to update the navbar state (call this after login/logout)
  updateNavBar(): void {
    // Check if a token is present, which is the definition of "logged in"
    this.isUserLoggedIn$.next(UserStorageService.hasToken());
  }

  // NEW: Overwrite the static signOut from UserStorageService to also emit state change
  signOut(): void {
    UserStorageService.signOut(); // Clear local storage
    this.updateNavBar(); // Inform the Navbar that the state has changed
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