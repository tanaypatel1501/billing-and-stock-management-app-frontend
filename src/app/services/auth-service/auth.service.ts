import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, EventEmitter } from '@angular/core';
import { Observable, catchError, map, tap, BehaviorSubject, of } from 'rxjs';
import { UserStorageService } from '../storage/user-storage.service';
import { ConfigService } from '../config.service';
import jwt_decode from 'jwt-decode';

const AUTH_HEADER = 'authorization';

export interface AddressLookupDTO {
  district: string;
  state: string;
  pincode: string;
}

/* -------------------- PAGINATION + SEARCH MODELS -------------------- */

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface SearchRequest {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  filters?: { [key: string]: string };
}

/* -------------------------------------------------------------------- */

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  tokenRefreshed = new EventEmitter<void>();
  static productId: any;

  // NEW: Auth state for navbar visibility
  private isUserLoggedIn$ = new BehaviorSubject<boolean>(UserStorageService.hasToken());
  public isAuthenticated$: Observable<boolean> = this.isUserLoggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    private userStorageService: UserStorageService,
    private configService: ConfigService
  ) {}

  /** Safe getter for base URL */
  private get baseUrl(): string {
    const url = this.configService.apiBaseUrl;
    if (!url) console.error('❌ BASE_URL missing — config.json not loaded.');
    return url || '';
  }

  /** Fix for blank screen reload */
  initializeAuth(): Promise<void> {
    return new Promise((resolve) => {
      const token = UserStorageService.getToken();
      if (token) {
        // optional token validation
      }
      resolve();
    });
  }

  /* ---------------------- AUTH ---------------------- */

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

  updateNavBar(): void {
    this.isUserLoggedIn$.next(UserStorageService.hasToken());
  }

  signOut(): void {
    UserStorageService.signOut();
    this.updateNavBar();
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

  /* ---------------------- POSTAL APIs ---------------------- */

  lookupPincode(pincode: string): Observable<AddressLookupDTO | null> {
    return this.http.get<AddressLookupDTO>(`${this.baseUrl}api/postal/${pincode}`, {
      headers: this.createAuthorizationHeader()
    }).pipe(catchError(() => of(null)));
  }

  getAllStates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}api/postal/states`, {
      headers: this.createAuthorizationHeader()
    });
  }

  getCitiesByState(state: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}api/postal/cities?state=${state}`, {
      headers: this.createAuthorizationHeader()
    });
  }

  findStateByDistrict(district: string): Observable<string | null> {
    const encoded = encodeURIComponent(district || '');
    const url = `${this.baseUrl}api/postal/lookup-state?district=${encoded}`;
    return this.http.get<string>(url, {
      headers: this.createAuthorizationHeader()
    }).pipe(catchError(() => of(null)));
  }

  getAddressesByDistrictAndState(district: string, state: string): Observable<AddressLookupDTO[]> {
    return this.http.get<AddressLookupDTO[]>(`${this.baseUrl}api/postal/addresses?district=${district}&state=${state}`, {
      headers: this.createAuthorizationHeader()
    });
  }

  /* ---------------------- BULK PRODUCT UPLOAD ---------------------- */

  uploadBulkProducts(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<any>(`${this.baseUrl}api/product/bulk`, fd, {
      headers: this.createAuthorizationHeader()
    });
  }

  uploadBulkProductsForm(fd: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}api/product/bulk`, fd, {
      headers: this.createAuthorizationHeader()
    });
  }

  /* ---------------------- PRODUCT ---------------------- */

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

  /* NEW: Paginated GET */
  getProductsPaginated(page = 0, size = 20): Observable<PageResponse<any>> {
    return this.http.get<PageResponse<any>>(
      `${this.baseUrl}api/product/get?page=${page}&size=${size}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  /* NEW: Search */
  searchProducts(params: SearchRequest): Observable<PageResponse<any>> {
    return this.http.post<PageResponse<any>>(
      `${this.baseUrl}api/product/search`,
      params,
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

  /* ---------------------- STOCK ---------------------- */

  addStock(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/stock/add`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  getStock(userId: any, page: number=0, size: number=20): Observable<any> {
    return this.http.get(`${this.baseUrl}api/stock/user/${userId}?page=${page}&size=${size}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  /* NEW: Search Stock */
  searchStock(params: SearchRequest): Observable<PageResponse<any>> {
    return this.http.post<PageResponse<any>>(
      `${this.baseUrl}api/stock/search`,
      params,
      { headers: this.createAuthorizationHeader() }
    );
  }

  updateStock(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}api/stock/update`, data,
      { headers: this.createAuthorizationHeader() }
    );
  }

  /* ---------------------- DETAILS ---------------------- */

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

  /* ---------------------- BILLING ---------------------- */

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

  /* NEW: Paginated Bills */
  getBillsPaginated(page = 0, size = 20): Observable<PageResponse<any>> {
    return this.http.get<PageResponse<any>>(
      `${this.baseUrl}api/bill/get?page=${page}&size=${size}`,
      { headers: this.createAuthorizationHeader() }
    );
  }

  /* NEW: Search Bills */
  searchBills(params: SearchRequest): Observable<PageResponse<any>> {
    return this.http.post<PageResponse<any>>(
      `${this.baseUrl}api/bill/search`,
      params,
      { headers: this.createAuthorizationHeader() }
    );
  }

  /* ---------------------- PROFILE ---------------------- */

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}api/user/profile`, {
      headers: this.createAuthorizationHeader()
    });
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}api/user/profile`, data, {
      headers: this.createAuthorizationHeader()
    });
  }

  changePassword(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/user/change-password`, data, {
      headers: this.createAuthorizationHeader()
    });
  }

}
