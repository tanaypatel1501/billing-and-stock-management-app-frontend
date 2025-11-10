import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, EventEmitter } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { UserStorageService } from '../storage/user-storage.service';
import { environment } from 'src/environments/environment';
import { AppComponent } from 'src/app/app.component';
import jwt_decode from 'jwt-decode';

const BASIC_URL = environment["BASIC_URL"];
const AUTH_HEADER = "authorization";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  tokenRefreshed = new EventEmitter<void>();
  static productId: any;
  constructor(private http: HttpClient, private userStorageService: UserStorageService) { }

  
  login(username: string, password: string): any {
    return this.http.post<[]>(BASIC_URL + 'authenticate', {
      username,
      password
    }, { observe: 'response' })
      .pipe(
        tap(_ => this.log('User Authentication')),
        map((res: HttpResponse<any>) => {
          console.log("res in service", res);
          this.userStorageService.saveUser(res.body);
          console.log(res);
          const token = res.headers.get(AUTH_HEADER);
          console.log(token)
          const bearerToken = token ? token.substring(7) : '';
          console.log(bearerToken)
          this.userStorageService.saveToken(bearerToken);
          const decodedToken : any = jwt_decode(bearerToken); 
            if (decodedToken && decodedToken.exp) {
              const expirationTime = (new Date(decodedToken.exp * 1000)).getTime(); 
              this.userStorageService.saveTokenExpiration(expirationTime);
              this.tokenRefreshed.emit(); // Emit the event
            }
          
          return res;
        }));
  }

  refreshToken(): any {
    console.log('Refreshing token...'); // Add this log message
    return this.http.post(BASIC_URL + 'refresh-token', null, {
      headers: this.createAuthorizationHeader(),
      observe: 'response' // Ensure you can access response headers
    })
    .pipe(
      tap((res: HttpResponse<any>) => {
        console.log('Token refresh response:', res); // Add this log message
      }),
      catchError((error: any) => {
        console.error('Token refresh error:', error); // Add this log message
        throw error;
      })
    );
  }
  
  register(data: any): Observable<any> {
    console.log(data);
    return this.http.post(BASIC_URL + "sign-up", data);
  }  

  createAuthorizationHeader(): HttpHeaders {
    let authHeaders: HttpHeaders = new HttpHeaders();
    return authHeaders.set(
      'Authorization',
      'Bearer ' + UserStorageService.getToken()
    );
  }

  log(message: string): void {
    console.log(`User Auth Service: ${message}`);
  }

  handleError<T>(operation = 'operation', result?: T): any {
    return (error: any): Observable<T> => {
      console.error(error);
      this.log(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }

  addProduct(data: any): Observable<any> {
    return this.http.post(BASIC_URL + `api/product/add`, data, {
      headers: this.createAuthorizationHeader()
    })
  }

  getProducts(userId: any): Observable<any> {
    return this.http.get(BASIC_URL + `api/product/all`, {
      headers: this.createAuthorizationHeader(),
    })
  }

  getProductById(productId: any): Observable<any> {
    return this.http.get(BASIC_URL + `api/product/${productId}`, {
      headers: this.createAuthorizationHeader(),
    })
  }

  editProduct(productId: number,data:any): Observable<any> {
    return this.http.put(BASIC_URL + `api/product/edit/${productId}`, data,{
      headers: this.createAuthorizationHeader(),
    })
  }

  deleteProduct(productId:any): Observable<any>{
    return this.http.delete(
      BASIC_URL + `api/product/delete/${productId}`,
      {
        headers: this.createAuthorizationHeader(),
      }
    );
  }
  
  addStock(data:any):Observable<any> {
    return this.http.post(BASIC_URL + `api/stock/add`, data, {
      headers: this.createAuthorizationHeader()
    })
  }

  getStock(userId:any):Observable<any>{
    return this.http.get(BASIC_URL + `api/stock/user/${userId}`,{
      headers: this.createAuthorizationHeader()
    })
  }

  updateStock(data:any):Observable<any> {
    return this.http.post(BASIC_URL + `api/stock/update`, data, {
      headers: this.createAuthorizationHeader()
    })
  }

  addDetails(userId:number,data:any):Observable<any>{
    return this.http.post(BASIC_URL + `api/details/create/${userId}`,data,{
      headers:this.createAuthorizationHeader()
    })
  }
  getDetailsByUserId(userId:any):Observable<any>{
    return this.http.get(BASIC_URL + `api/details/${userId}`,{
      headers:this.createAuthorizationHeader()
    })
  }
  editDetails(userId: number,data:any): Observable<any> {
    return this.http.put(BASIC_URL + `api/details/update/${userId}`, data,{
      headers: this.createAuthorizationHeader(),
    })
  }
  deleteDetails(userId:any): Observable<any>{
    return this.http.delete(
      BASIC_URL + `api/details/delete/${userId}`,
      {
        headers: this.createAuthorizationHeader(),
      }
    );
  }

  createBill(data:any):Observable<any>{
    return this.http.post(BASIC_URL + `api/bill/add`, data,{
      headers: this.createAuthorizationHeader(),
    })
  }
  addBillItem(data:any):Observable<any>{
    return this.http.post(BASIC_URL + `api/bill_items/add`, data,{
      headers: this.createAuthorizationHeader(),
    })
  }

  getBillById(billId:any):Observable<any>{
    return this.http.get(BASIC_URL + `api/bill/${billId}`,{
      headers:this.createAuthorizationHeader()
    })
  }

  getBills(userId:any):Observable<any>{
    return this.http.get(BASIC_URL + `api/bill/user/${userId}`,{
      headers:this.createAuthorizationHeader()
    })
  }
}


