import { Component } from '@angular/core';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-loading',
  template: `
    <div class="loading-overlay" *ngIf="loadingService.loading$ | async">
      <div class="spinner"></div>
      </div>
  `,
  styleUrls: ['loading.component.css'],
})
export class LoadingComponent {
  constructor(public loadingService: LoadingService) {}
}