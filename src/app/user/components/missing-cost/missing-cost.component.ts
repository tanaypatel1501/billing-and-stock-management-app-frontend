import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCoins, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { AuthService, PageResponse } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-missing-cost',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, LoadingSpinnerComponent],
  templateUrl: './missing-cost.component.html',
  styleUrls: ['../bills/bills.component.scss', './missing-cost.component.scss']
})
export class MissingCostComponent implements OnInit {

  faArrowLeft = faArrowLeft; faCoins = faCoins; faCheck = faCheck; faSpinner = faSpinner;

  items: any[] = [];
  costInput: { [stockId: number]: string } = {};

  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  readonly pageSize = 15;

  isLoading = true;
  initialLoaded = false;
  savingId: number | null = null;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {
    this.isLoading = true;
    const key = `stock:missing:${page}:${this.pageSize}`;
    const cached = this.requestCache.get(key);
    if (cached) {
      this.apply(cached);
      return;
    }
    this.authService.getMissingCostStock(page, this.pageSize).subscribe({
      next: (data: PageResponse<any>) => {
        this.requestCache.set(key, data);
        this.apply(data);
      },
      error: () => {
        this.alertService.error('Failed to load stock.');
        this.isLoading = false;
        this.initialLoaded = true;
      }
    });
  }

  private apply(data: PageResponse<any>): void {
    this.items = data.content ?? [];
    this.totalPages = data.totalPages;
    this.totalElements = data.totalElements;
    this.currentPage = data.number;
    this.isLoading = false;
    this.initialLoaded = true;
  }

  save(row: any): void {
    const raw = (this.costInput[row.id] ?? '').toString().trim();
    if (raw === '') {
      this.alertService.error('Enter the cost per unit.');
      return;
    }
    const cost = Number(raw);
    if (!Number.isFinite(cost) || cost < 0) {
      this.alertService.error('Cost must be a number, 0 or more.');
      return;
    }

    this.savingId = row.id;
    this.authService.updateStockCost(row.id, cost).subscribe({
      next: () => {
        this.requestCache.invalidateMany(['stock:', 'stockLogs:', 'sales:profit:']);
        this.items = this.items.filter(i => i.id !== row.id);
        delete this.costInput[row.id];
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.totalPages = Math.ceil(this.totalElements / this.pageSize);
        this.savingId = null;
        this.alertService.success('Cost saved.');

        // The page emptied out but more rows remain: load the nearest page
        if (this.items.length === 0 && this.totalElements > 0) {
          this.load(Math.min(this.currentPage, Math.max(0, this.totalPages - 1)));
        }
      },
      error: (err) => {
        this.savingId = null;
        this.alertService.error(err?.error?.message || 'Failed to save cost.');
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.load(page);
      window.scrollTo(0, 0);
    }
  }

  goToSales(): void {
    this.router.navigate(['/user/sales']);
  }

  trackById(_: number, row: any): number {
    return row.id;
  }
}