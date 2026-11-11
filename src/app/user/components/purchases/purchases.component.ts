import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTruckRampBox, faArrowLeft, faCalendar, faArrowRight,
  faXmark, faPlus, faRotateLeft, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { AuthService, PageResponse } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { SearchBarComponent } from 'src/app/shared/search-bar/search-bar.component';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { SuppressDockDirective } from 'src/app/shared/suppress-dock/suppress-dock.directive';
import { DebouncedSearch } from 'src/app/shared/utils/debounced-search';
import { ScrollThrottle } from 'src/app/shared/utils/scroll-throttle';
import { Purchase, Supplier, TaxMode } from 'src/app/models/purchase.model';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    SearchBarComponent,
    FilterButtonComponent,
    LoadingSpinnerComponent,
    SuppressDockDirective
  ],
  templateUrl: './purchases.component.html',
  styleUrls: ['../bills/bills.component.scss', './purchases.component.scss']
})
export class PurchasesComponent implements OnInit, OnDestroy {

  faTruckRampBox = faTruckRampBox; faArrowLeft = faArrowLeft; faCalendar = faCalendar;
  faArrowRight = faArrowRight; faXmark = faXmark; faPlus = faPlus;
  faRotateLeft = faRotateLeft; faSpinner = faSpinner;

  purchases: Purchase[] = [];

  // search + filters
  searchText = '';
  fromDate = '';
  toDate = '';
  suggestions: Supplier[] = [];
  isSuggestionLoading = false;

  // pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 20;
  isLastPage = false;

  isLoading = true;
  initialLoadComplete = false;

  // detail popup
  selected: Purchase | null = null;
  isDetailLoading = false;
  isReverting = false;

  private debouncedSearch = new DebouncedSearch(text => this.performSuggestionSearch(text), 250);
  private scrollThrottle = new ScrollThrottle(() => this.checkScrollPosition(), 150);

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load(0, false);
  }

  ngOnDestroy(): void {
    this.debouncedSearch.destroy();
    this.scrollThrottle.destroy();
  }

  /* ---------- Load ---------- */

  load(page: number = 0, append: boolean = false): void {
    this.isLoading = true;
    const params = {
      page, size: this.pageSize,
      searchText: this.searchText, fromDate: this.fromDate, toDate: this.toDate
    };
    const cacheKey = `purchases:${JSON.stringify(params)}`;

    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.applyPage(cached, append);
      return;
    }

    this.authService.getPurchasesPage(params).subscribe({
      next: (data: PageResponse<Purchase>) => {
        this.requestCache.set(cacheKey, data);
        this.applyPage(data, append);
      },
      error: () => {
        this.alertService.error('Failed to load purchases.');
        this.isLoading = false;
        this.initialLoadComplete = true;
      }
    });
  }

  private applyPage(data: PageResponse<Purchase>, append: boolean): void {
    const incoming = data.content ?? [];
    this.purchases = append ? [...this.purchases, ...incoming] : incoming;
    this.totalPages = data.totalPages;
    this.totalElements = data.totalElements;
    this.currentPage = data.number;
    this.isLastPage = data.number >= data.totalPages - 1;
    this.isLoading = false;
    this.initialLoadComplete = true;
  }

  /* ---------- Search and filters ---------- */

  handleTyping(event: any): void {
    const text = typeof event === 'string' ? event : (event?.target as HTMLInputElement)?.value ?? '';
    if (text.length > 1) {
      this.isSuggestionLoading = true;
      this.debouncedSearch.next(text);
    } else {
      this.suggestions = [];
      this.isSuggestionLoading = false;
    }
  }

  private performSuggestionSearch(text: string): void {
    this.authService.searchSuppliers(text).subscribe({
      next: data => { this.suggestions = data; this.isSuggestionLoading = false; },
      error: () => { this.suggestions = []; this.isSuggestionLoading = false; }
    });
  }

  handleSearch(eventData: any): void {
    this.searchText = typeof eventData === 'string' ? eventData : (eventData?.name ?? '');
    this.purchases = [];
    this.load(0, false);
  }

  handleFilterSort(event: { fromDate?: string; toDate?: string }): void {
    this.fromDate = event.fromDate ?? '';
    this.toDate = event.toDate ?? '';
    this.purchases = [];
    this.load(0, false);
  }

  goBack(): void {
    this.searchText = '';
    this.fromDate = '';
    this.toDate = '';
    this.suggestions = [];
    this.purchases = [];
    this.load(0, false);
  }

  get isSearchActive(): boolean { return this.searchText.trim().length > 0; }
  get isDateFilterActive(): boolean { return !!this.fromDate || !!this.toDate; }
  get isInitialEmpty(): boolean {
    return this.initialLoadComplete && this.totalElements === 0
      && !this.isSearchActive && !this.isDateFilterActive;
  }

  /* ---------- Pagination ---------- */

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.load(page, false);
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    let start = Math.max(0, this.currentPage - 1);
    let end = Math.min(this.totalPages - 1, start + 2);
    if (end - start < 2) start = Math.max(0, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.scrollThrottle.trigger();
  }

  private checkScrollPosition(): void {
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop)
                + document.documentElement.offsetHeight;
      if (pos > document.documentElement.scrollHeight - 100) {
        this.load(this.currentPage + 1, true);
      }
    }
  }

  trackById(_: number, p: Purchase): number | undefined {
    return p.id;
  }

  /* ---------- Detail popup ---------- */

  openDetail(p: Purchase): void {
    this.selected = p;               // header shows immediately, items load next
    this.isDetailLoading = true;
    this.authService.getPurchaseById(p.id!).subscribe({
      next: full => { this.selected = full; this.isDetailLoading = false; },
      error: () => {
        this.alertService.error('Failed to load purchase details.');
        this.closeDetail();
      }
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.isDetailLoading = false;
  }

  /* ---------- Revert ---------- */

  confirmRevert(): void {
    const p = this.selected;
    if (!p) return;
    this.alertService.confirm(
      `Revert invoice ${p.supplierInvoiceNo} from ${p.supplierName}?\nThis removes the purchased stock and \n𝗖𝗔𝗡𝗡𝗢𝗧 𝗕𝗘 𝗨𝗡𝗗𝗢𝗡𝗘.`,
      () => this.revert(p),
      'Revert Purchase',
      () => {},
      'error'
    );
  }

  private revert(p: Purchase): void {
    this.isReverting = true;
    this.authService.revertPurchase(p.id!).subscribe({
      next: () => {
        this.requestCache.invalidateMany(['purchases:', 'stock:', 'inventory-value:', 'stockLogs:']);
        this.alertService.success('Purchase reverted. Stock has been updated.');
        this.isReverting = false;
        this.closeDetail();
        this.load(this.currentPage, false);
      },
      error: (err) => {
        this.isReverting = false;
        this.alertService.error(err?.error?.message || 'Failed to revert purchase.', 'Revert Failed', 6000);
      }
    });
  }

  /* ---------- Navigation and helpers ---------- */

  newPurchase(): void {
    this.router.navigate(['/user/create-purchase']);
  }

  taxLabel(mode: TaxMode | undefined): string {
    return mode === 'IGST' ? 'IGST' : 'CGST + SGST';
  }
}