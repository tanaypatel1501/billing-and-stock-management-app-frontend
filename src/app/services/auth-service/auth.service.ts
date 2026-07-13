import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, EventEmitter } from '@angular/core';
import { Observable, catchError, throwError, map, tap, BehaviorSubject, of } from 'rxjs';
import { UserStorageService } from '../storage/user-storage.service';
import { ConfigService } from '../config.service';
import jwt_decode from 'jwt-decode';
import { RequestCacheService } from '../cache/request-cache.service';

const AUTH_HEADER = 'authorization';

export interface AddressLookupDTO {
  district: string;
  state: string;
  pincode: string;
}

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
  searchText?: string;
  sortBy?: string;
  sortDir?: string;
  filters?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  tokenRefreshed = new EventEmitter<void>();
  static productId: any;

  private isUserLoggedIn$ = new BehaviorSubject<boolean>(UserStorageService.hasToken());
  public isAuthenticated$: Observable<boolean> = this.isUserLoggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    private userStorageService: UserStorageService,
    private configService: ConfigService,
    private requestCache: RequestCacheService
  ) {}

  private get baseUrl(): string {
    const url = this.configService.apiBaseUrl;
    if (!url) console.error('❌ BASE_URL missing — config.json not loaded.');
    return url || '';
  }

  initializeAuth(): Promise<void> {
    return new Promise((resolve) => {
      const token = UserStorageService.getToken();
      if (token) {
        // optional token validation
      }
      resolve();
    });
  }

  getAvailableTemplates(): Observable<any[]> {
    return of([
      { id: 'template1', name: 'Classic Landscape', description: 'Traditional horizontal layout', orientation: 'landscape', color: '#2c3e50' },
      { id: 'template2', name: 'Modern Portrait', description: 'Contemporary vertical layout with colored header', orientation: 'portrait', color: '#1a3c5e' }
    ]);
  }

  /* ---------------------- AUTH ---------------------- */

  login(username: string, password: string): any {
    return this.http
      .post<[]>(`${this.baseUrl}authenticate`, { username, password }, { observe: 'response' })
      .pipe(
        tap(() => console.log('User Authentication')),
        map((res: HttpResponse<any>) => {
          const token = res.headers.get(AUTH_HEADER);
          const bearer = token ? token.substring(7) : '';

          this.userStorageService.saveToken(bearer);
          this.updateNavBar();

          const decoded: any = jwt_decode(bearer);
          if (decoded?.exp) {
            this.userStorageService.saveTokenExpiration(decoded.exp * 1000);
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
    this.requestCache.clearAll();
  }

  refreshToken(): Observable<HttpResponse<any>> {
    return this.http
      .post(`${this.baseUrl}refresh-token`, null, {
        headers: this.createAuthorizationHeader(),
        observe: 'response'
      })
      .pipe(
        tap((response: HttpResponse<any>) => {
          const tokenHeader = response.headers.get(AUTH_HEADER);
          const bearerToken = tokenHeader ? tokenHeader.substring(7) : null;

          if (!bearerToken) {
            return;
          }

          this.userStorageService.saveToken(bearerToken);

          const decoded: any = jwt_decode(bearerToken);
          if (decoded?.exp) {
            this.userStorageService.saveTokenExpiration(decoded.exp * 1000);
          }

          this.tokenRefreshed.emit();
        }),
        catchError(error => {
          console.error('Token refresh error:', error);
          return throwError(() => error);
        })
      );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}sign-up`, data);
  }

  createAuthorizationHeader(): HttpHeaders {
    return new HttpHeaders().set('Authorization', 'Bearer ' + UserStorageService.getToken());
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}forgot-password`, { email });
  }

  resetPassword(data: { token: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}reset-password`, data);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}verify-email`, { token });
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}resend-verification`, { email });
  }

  googleSignIn(idToken: string): any {
    return this.http
      .post<any>(`${this.baseUrl}auth/google`, { idToken }, { observe: 'response' })
      .pipe(
        map((res: HttpResponse<any>) => {
          const token = res.headers.get('authorization');
          const bearer = token ? token.substring(7) : '';
          this.userStorageService.saveToken(bearer);
          this.updateNavBar();
          const decoded: any = jwt_decode(bearer);
          if (decoded?.exp) {
            this.userStorageService.saveTokenExpiration(decoded.exp * 1000);
            this.tokenRefreshed.emit();
          }
          return res;
        })
      );
  }

  /* ---------------------- POSTAL APIs ---------------------- */

  lookupPincode(pincode: string): Observable<AddressLookupDTO | null> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<AddressLookupDTO>(`${this.baseUrl}api/postal/${pincode}`, { headers }).pipe(catchError(() => of(null)));
  }

  getAllStates(): Observable<string[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<string[]>(`${this.baseUrl}api/postal/states`, { headers });
  }

  getCitiesByState(state: string): Observable<string[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<string[]>(`${this.baseUrl}api/postal/cities?state=${state}`, { headers });
  }

  findStateByDistrict(district: string): Observable<string | null> {
    const encoded = encodeURIComponent(district || '');
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    const url = `${this.baseUrl}api/postal/lookup-state?district=${encoded}`;
    return this.http.get<string>(url, { headers }).pipe(catchError(() => of(null)));
  }

  getAddressesByDistrictAndState(district: string, state: string): Observable<AddressLookupDTO[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<AddressLookupDTO[]>(`${this.baseUrl}api/postal/addresses?district=${district}&state=${state}`, { headers });
  }

  /* ---------------------- BULK PRODUCT UPLOAD ---------------------- */

  uploadBulkProducts(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<any>(`${this.baseUrl}api/product/bulk`, fd, { headers: this.createAuthorizationHeader() });
  }

  uploadBulkProductsForm(fd: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}api/product/bulk`, fd, { headers: this.createAuthorizationHeader() });
  }

  /* ---------------------- PRODUCT ---------------------- */

  addProduct(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/product/add`, data, { headers: this.createAuthorizationHeader() });
  }

  getProducts(): Observable<any> {
    return this.http.get(`${this.baseUrl}api/product/all`, { headers: this.createAuthorizationHeader() });
  }

  getProductsPaginated(page = 0, size = 20): Observable<PageResponse<any>> {
    return this.http.get<PageResponse<any>>(`${this.baseUrl}api/product/get?page=${page}&size=${size}`, { headers: this.createAuthorizationHeader() });
  }

  searchProducts(params: SearchRequest): Observable<PageResponse<any>> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post<PageResponse<any>>(`${this.baseUrl}api/product/search`, params, { headers });
  }

  getProductById(productId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/product/${productId}`, { headers: this.createAuthorizationHeader() });
  }

  editProduct(productId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}api/product/edit/${productId}`, data, { headers: this.createAuthorizationHeader() });
  }

  deleteProduct(productId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}api/product/delete/${productId}`, { headers: this.createAuthorizationHeader() });
  }

  /* ---------------------- STOCK ---------------------- */

  // `userId` param kept for call-site compatibility; backend now derives identity from the JWT.
  getInventoryValue(userId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}api/stock/user/inventory-value`, {
      headers: this.createAuthorizationHeader().set('X-Skip-Loader', 'true')
    });
  }

  addStock(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/stock/add`, data, { headers: this.createAuthorizationHeader() });
  }

  getStock(userId: any, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${this.baseUrl}api/stock/user?page=${page}&size=${size}`, { headers: this.createAuthorizationHeader() });
  }

  getStockById(stockId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}api/stock/${stockId}`, { headers: this.createAuthorizationHeader() });
  }

  searchStock(params: SearchRequest): Observable<PageResponse<any>> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post<PageResponse<any>>(`${this.baseUrl}api/stock/search`, params, { headers });
  }

  updateStock(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}api/stock/update`, data, { headers: this.createAuthorizationHeader() });
  }

  deleteStock(stockId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}api/stock/${stockId}`, { headers: this.createAuthorizationHeader() });
  }

  /* ---------------------- STOCK LOGS ---------------------- */

  getStockHistory(stockId: number) {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<any[]>(`${this.baseUrl}api/stock-logs/${stockId}`, { headers });
  }

  addStockLog(logData: { stockId: number, action: string, notes: string }) {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post(`${this.baseUrl}api/stock-logs`, logData, { headers });
  }

  getAllStockLogsByUser(userId: any, search: string, page = 0, size = 30): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    let params = `?page=${page}&size=${size}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    return this.http.get(`${this.baseUrl}api/stock-logs/user${params}`, { headers });
  }

  /* ---------------------- DETAILS ---------------------- */

  addDetails(userId: number, details: any, logoFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    if (logoFile) formData.append('logo', logoFile);
    return this.http.post(`${this.baseUrl}api/details/create`, formData, { headers: this.createAuthorizationHeader() });
  }

  getDetailsByUserId(userId: any): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/details`, { headers });
  }

  editDetails(userId: number, details: any, logoFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    if (logoFile) formData.append('logo', logoFile);
    return this.http.put(`${this.baseUrl}api/details/update`, formData, { headers: this.createAuthorizationHeader() });
  }

  deleteDetails(userId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}api/details/delete`, { headers: this.createAuthorizationHeader() });
  }

  /* ---------------------- BILLING ---------------------- */

  createBill(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/bill/add`, data, { headers: this.createAuthorizationHeader() });
  }

  getBillById(billId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/bill/${billId}`, { headers: this.createAuthorizationHeader() });
  }

  getBills(userId: any): Observable<any> {
    return this.http.get(`${this.baseUrl}api/bill/user`, { headers: this.createAuthorizationHeader() });
  }

  getBillsPaginated(page = 0, size = 20): Observable<PageResponse<any>> {
    return this.http.get<PageResponse<any>>(`${this.baseUrl}api/bill/get?page=${page}&size=${size}`, { headers: this.createAuthorizationHeader() });
  }

  searchBills(params: SearchRequest): Observable<PageResponse<any>> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post<PageResponse<any>>(`${this.baseUrl}api/bill/search`, params, { headers });
  }

  updateBillPaidStatus(billId: number, paid: boolean): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.patch(`${this.baseUrl}api/bill/${billId}/paid?paid=${paid}`, null, { headers });
  }

  getPdfBlob(billId: number): Observable<Blob> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/pdf/bill/${billId}`, { headers, responseType: 'blob' });
  }

  downloadBillsZip(billIds: number[]): Observable<Blob> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post(`${this.baseUrl}api/pdf/bills/zip`, billIds, {
      headers,
      responseType: 'blob'
    });
  }

  /* ---------------------- PURCHASER ---------------------- */

  searchPurchasers(name: string): Observable<any[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<any[]>(`${this.baseUrl}api/purchaser/search?name=${encodeURIComponent(name)}`, { headers });
  }

  savePurchaser(data: any): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post(`${this.baseUrl}api/purchaser/save`, data, { headers });
  }

  deletePurchaser(purchaserId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}api/purchaser/${purchaserId}`, { headers: this.createAuthorizationHeader() });
  }

  getAllPurchasers(userId: number, params: { page?: number; size?: number; searchText?: string } = {}): Observable<PageResponse<any>> {
    const { page = 0, size = 20, searchText = '' } = params;
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<PageResponse<any>>(`${this.baseUrl}api/purchaser/page?search=${encodeURIComponent(searchText)}&page=${page}&size=${size}`, { headers });
  }

  /* ---------------------- SALES ---------------------- */

  getSalesSummary(userId: any, paidOnly: boolean = false): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/sales/user/summary?paidOnly=${paidOnly}`, { headers });
  }

  getTopProducts(userId: any, paidOnly: boolean = false, limit: number = 5): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/sales/user/top-products?paidOnly=${paidOnly}&limit=${limit}`, { headers });
  }

  getMonthlySales(userId: any, year: number, paidOnly: boolean = false): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/sales/user/monthly?year=${year}&paidOnly=${paidOnly}`, { headers });
  }

  getYearlySales(userId: any, paidOnly: boolean = false): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/sales/user/yearly?paidOnly=${paidOnly}`, { headers });
  }

  getAvailableYears(userId: any): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/sales/user/years`, { headers });
  }

  /* ---------------------- PROFILE ---------------------- */

  getProfile(): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/user/profile`, { headers });
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}api/user/profile`, data, { headers: this.createAuthorizationHeader() });
  }

  changePassword(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}api/user/change-password`, data, { headers: this.createAuthorizationHeader() });
  }

  /* ---------------------- LOGO ---------------------- */

  getLogoUrl(userId: any): Observable<string> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get(`${this.baseUrl}api/logo`, { headers, responseType: 'blob' }).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of('assets/images/default-gst-medicose.png'))
    );
  }

  /* ---------------------- OCR ---------------------- */

  scanOcrLabel(formData: FormData): Observable<any> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post<any>(`${this.baseUrl}api/ocr/scan`, formData, { headers });
  }

  /* ---------------------- PRODUCT REQUESTS ---------------------- */

  submitProductRequest(dto: ProductRequestDTO, userId: number): Observable<ProductRequestDTO> {
    return this.http.post<ProductRequestDTO>(`${this.baseUrl}api/product-requests/submit`, dto, { headers: this.createAuthorizationHeader() });
  }

  getMyProductRequests(userId: number): Observable<ProductRequestDTO[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<ProductRequestDTO[]>(`${this.baseUrl}api/product-requests/my`, { headers });
  }

  getPendingProductRequests(): Observable<ProductRequestDTO[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<ProductRequestDTO[]>(`${this.baseUrl}api/product-requests/pending`, { headers });
  }

  getAllProductRequests(): Observable<ProductRequestDTO[]> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.get<ProductRequestDTO[]>(`${this.baseUrl}api/product-requests/all`, { headers });
  }

  approveProductRequest(requestId: number, adminNotes = ''): Observable<ProductRequestDTO> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post<ProductRequestDTO>(`${this.baseUrl}api/product-requests/${requestId}/approve`, { adminNotes }, { headers });
  }

  rejectProductRequest(requestId: number, adminNotes = ''): Observable<ProductRequestDTO> {
    const headers = this.createAuthorizationHeader().set('X-Skip-Loader', 'true');
    return this.http.post<ProductRequestDTO>(`${this.baseUrl}api/product-requests/${requestId}/reject`, { adminNotes }, { headers });
  }
}

export interface ProductRequestDTO {
  id?: number;
  name: string;
  packing?: string;
  hsn?: string | null;
  mrp?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedByName?: string;
  requestedByEmail?: string;
  createdAt?: string;
  reviewedAt?: string;
  adminNotes?: string;
}