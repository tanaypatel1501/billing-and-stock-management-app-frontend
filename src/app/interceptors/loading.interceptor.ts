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
    
    // --- ADD THIS BLOCK START ---
    // Check if the custom header exists
    if (request.headers.has('X-Skip-Loader')) {
      // Clone the request to remove the header so it doesn't reach the server
      const modifiedRequest = request.clone({
        headers: request.headers.delete('X-Skip-Loader')
      });
      // Pass the request through WITHOUT incrementing activeRequests or showing loader
      return next.handle(modifiedRequest);
    }
    // --- ADD THIS BLOCK END ---

    // 1. SHOW LOADER: Increment counter and show loader if it's the first active request
    if (this.activeRequests === 0) {
      this.loadingService.show();
    }
    this.activeRequests++;

    return next.handle(request).pipe(
      finalize(() => {
        this.activeRequests--;
        if (this.activeRequests === 0) {
          this.loadingService.hide();
        }
      })
    );
  }
}