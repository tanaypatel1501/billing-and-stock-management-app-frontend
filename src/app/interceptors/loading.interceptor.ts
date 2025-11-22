import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  constructor(private loadingService: LoadingService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // 1. SHOW LOADER: Increment counter and show loader if it's the first active request
    if (this.activeRequests === 0) {
      this.loadingService.show();
    }
    this.activeRequests++;

    // 2. PASS REQUEST: Handle the request and listen for its completion
    return next.handle(request).pipe(
      // 3. HIDE LOADER: When the request is done (success or error), decrement and hide if counter is zero
      finalize(() => {
        this.activeRequests--;
        if (this.activeRequests === 0) {
          this.loadingService.hide();
        }
      })
    );
  }
}