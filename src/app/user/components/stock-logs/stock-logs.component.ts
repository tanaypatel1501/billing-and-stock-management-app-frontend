import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFilter, faTimes, faClockRotateLeft, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { SearchBarComponent } from 'src/app/shared/search-bar/search-bar.component';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';
import { DebouncedSearch } from 'src/app/shared/utils/debounced-search';
import { ScrollThrottle } from 'src/app/shared/utils/scroll-throttle';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';

@Component({
  selector: 'app-stock-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, SearchBarComponent, FilterButtonComponent],
  templateUrl: './stock-logs.component.html',
  styleUrls: ['./stock-logs.component.scss']
})
export class StockLogsComponent implements OnInit, OnDestroy {
  faFilter = faFilter;
  faTimes = faTimes;
  faClockRotateLeft = faClockRotateLeft;
  faArrowLeft = faArrowLeft;

  logs: any[] = [];
  filteredLogs: any[] = [];
  isLoading = true;
  isSuggestionLoading = false;
  searchText = '';
  selectedAction = '';
  suggestions: any[] = [];
  userId: any;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 30;
  isLastPage = false;
  availableActions: string[] = [];
  
  // Define available sorting options for the filter modal
  filterColumns = [
    { label: 'Date & Time', value: 'timestamp' },
    { label: 'Product Name', value: 'productName' },
    { label: 'Action Type', value: 'action' }
  ];
  
  // Set default sorting parameters
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'desc';

  private debouncedSearch = new DebouncedSearch(text => this.performSuggestionSearch(text), 250);
  private scrollThrottle = new ScrollThrottle(() => this.checkScrollPosition(), 150);

  get isSearchActive(): boolean {
    return this.searchText.trim().length > 0;
  }

  constructor(
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private userStorageService: UserStorageService,
    private requestCache: RequestCacheService
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.debouncedSearch.destroy();
    this.scrollThrottle.destroy();
  }

  loadLogs(page: number = 0, append: boolean = false) {
    this.isLoading = true;
    const cacheKey = `stockLogs:list:${this.userId}:${JSON.stringify({ searchText: this.searchText, page, size: this.pageSize })}`;

    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.applyLogsPage(cached, append);
      return;
    }

    this.authService.getAllStockLogsByUser(this.userId, this.searchText, page, this.pageSize)
      .subscribe({
        next: (data: any) => {
          this.requestCache.set(cacheKey, data);
          this.applyLogsPage(data, append);
        },
        error: () => { this.isLoading = false; }
      });
  }

  private applyLogsPage(data: any, append: boolean): void {
    const incoming = data.content || [];
    this.logs = append ? [...this.logs, ...incoming] : incoming;
    this.totalPages = data.totalPages;
    this.totalElements = data.totalElements;
    this.currentPage = data.number;
    this.isLastPage = data.last;
    this.suggestions = [];
    this.extractActions();
    this.applyFilters();
    this.isLoading = false;
  }

  // Search-bar suggestion typing — queries backend for matching product names
  handleTyping(text: string) {
    if (text.length > 1) {
      this.isSuggestionLoading = true;
      this.debouncedSearch.next(text);
    } else {
      this.suggestions = [];
      this.isSuggestionLoading = false;
    }
  }

  private performSuggestionSearch(text: string) {
    this.authService.getAllStockLogsByUser(this.userId, text, 0, 5)
      .subscribe({
        next: (data: any) => {
          const seen = new Set<string>();
          this.suggestions = (data.content || [])
            .filter((log: any) => {
              if (!log.productName || seen.has(log.productName)) return false;
              seen.add(log.productName);
              return true;
            })
            .map((log: any) => ({
              product: { name: log.productName, packing: log.productPacking || '' }
            }));
          this.isSuggestionLoading = false;
        },
        error: () => {
          this.suggestions = [];
          this.isSuggestionLoading = false;
        }
      });
  }

  // Search-bar select/search — mirrors dashboard handleSearch
  handleSearch(eventData: any) {
    this.currentPage = 0;
    if (typeof eventData === 'string') {
      this.searchText = eventData;
    } else {
      // Selected from suggestions — shaped as { product: { name } }
      this.searchText = eventData?.product?.name ?? eventData?.productName ?? '';
    }
    this.isLoading = true;
    this.loadLogs(0, false);
  }

  resetView() {
    this.searchText = '';
    this.selectedAction = '';
    this.sortColumn = null;
    this.sortDirection = 'desc';
    this.currentPage = 0;
    this.isLoading = true;
    this.loadLogs(0, false);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadLogs(page, false);
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): number[] {
    const pages = [];
    let start = Math.max(0, this.currentPage - 1);
    let end = Math.min(this.totalPages - 1, start + 2);
    if (end - start < 2) start = Math.max(0, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrollThrottle.trigger();
  }

  private checkScrollPosition() {
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop)
        + document.documentElement.offsetHeight;
      if (pos > document.documentElement.scrollHeight - 100) {
        this.loadLogs(this.currentPage + 1, true);
      }
    }
  }

  extractActions() {
    const set = new Set(this.logs.map(l => l.action));
    this.availableActions = Array.from(set).sort();
  }

  // Processes both action filtering and structural sorting configurations
  applyFilters() {
    let result = this.logs.filter(log => {
      return !this.selectedAction || log.action === this.selectedAction;
    });

    if (this.sortColumn) {
      result.sort((a, b) => {
        let valA = a[this.sortColumn!];
        let valB = b[this.sortColumn!];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredLogs = result;
  }

  // Intercepts modal changes and applies choices instantly
  handleFilterSort(event: { sortBy: string | null; direction: 'asc' | 'desc'; action?: string }) {
    this.sortColumn = event.sortBy;
    this.sortDirection = event.direction;
    
    if (event.action !== undefined) {
      this.selectedAction = event.action;
    }
    
    this.applyFilters();
  }

  onActionFilter() {
    this.applyFilters();
  }

  clearFilters() {
    this.selectedAction = '';
    this.sortColumn = null;
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  handleLogClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const billLink = target.closest('.bill-link') as HTMLElement | null;
    if (billLink) {
      const billId = billLink.getAttribute('data-bill-id');
      if (billId) {
        this.userStorageService.saveBillId(billId);
        this.router.navigate(['user/bill-preview']);
      }
    }
  }
}