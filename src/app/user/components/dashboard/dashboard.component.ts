import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { Router } from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faPencil, faArrowLeft, faCartFlatbed, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common'; 
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';
import { ConfirmDeleteModalComponent } from 'src/app/shared/confirm-delete-modal/confirm-delete-modal.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  standalone: true,           
  imports: [
    CommonModule,             
    SearchBarComponent, 
    FilterButtonComponent,   
    ConfirmDeleteModalComponent,     
    FontAwesomeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  faTrashCan = faTrashCan;
  faPencil = faPencil;
  faArrowLeft = faArrowLeft;
  faCartFlatbed = faCartFlatbed;
  faCircleInfo = faCircleInfo;
  stock: any[] = [];
  isSearchActive: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  totalElements: number = 0;
  pageSize: number = 10;
  initialLoadComplete = false;
  isLoading: boolean = true;
  isSuggestionLoading: boolean = false;
  isLastPage: boolean = false;
  userId!: any;
  expandedIndex: number | null = null;
  sortColumn: string | null = 'expiryDate';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  showLogModal = false;
  isLoadingLogs = false;
  currentStockLogs: any[] = [];
  searchText: string = '';
  suggestions: any[] = [];
  showDeleteModal = false;
  stockToDeleteId: number | null = null;
  details: any = {};
  totalInventoryValue: number = 0;
  isLoadingInventoryValue: boolean = true;
  isRefreshingInventoryValue: boolean = false;
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private scrollThrottleTimeout: any = null;

  get filterColumns() {
    const base = [
      { label: 'Product Name', value: 'product.name' },
      { label: 'Packing', value: 'product.packing' },
      { label: 'HSN', value: 'product.HSN' },
      { label: 'Batch No.', value: 'batchNo' },
      { label: 'Expiry Date', value: 'expiryDate' },
      { label: 'Quantity', value: 'quantity' },
      { label: 'MRP', value: 'product.MRP' },
    ];

    if (this.details?.taxMode === 'IGST') {
      base.push({ label: 'IGST', value: 'product.CGST' });
    } else {
      base.push({ label: 'CGST', value: 'product.CGST' });
      base.push({ label: 'SGST', value: 'product.SGST' });
    }

    return base;
  }

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.authService.getDetailsByUserId(this.userId).subscribe(
      (response: any) => this.details = response || {}
    );
    this.loadInitialData();
    this.loadInventoryValue();
    this.subscriptions.push(
      this.searchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged()
      ).subscribe(text => this.performSuggestionSearch(text))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.scrollThrottleTimeout) clearTimeout(this.scrollThrottleTimeout);
  }

  
  loadInventoryValue(isRefresh: boolean = false) {
    if (isRefresh) {
      this.isRefreshingInventoryValue = true;
    } else {
      this.isLoadingInventoryValue = true;
    }

    this.authService.getInventoryValue(this.userId).subscribe({
      next: (value: number) => {
        this.totalInventoryValue = value;
        this.isLoadingInventoryValue = false;
        this.isRefreshingInventoryValue = false;
      },
      error: () => {
        this.totalInventoryValue = 0;
        this.isLoadingInventoryValue = false;
        this.isRefreshingInventoryValue = false;
      }
    });
  }

  get isInitialEmpty(): boolean {
    return !this.isLoading && this.stock.length === 0 && !this.isSearchActive;
  }

  toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

  loadData(page: number = 0, append: boolean = false) {
    this.isLoading = true;
    if (!append && page === 0) {
      this.stock = [];
    }
    const searchRequest = {
      page: page,
      size: this.pageSize,
      sortBy: this.sortColumn || 'id', 
      direction: this.sortDirection,
      searchText: this.searchText,   
      filters: { "user.id": this.userId.toString() }
    };

    this.authService.searchStock(searchRequest).subscribe({
      next: (data: any) => {
        this.totalPages = data.totalPages;
        this.isLastPage = data.last;
        this.currentPage = data.number;
        this.totalElements = data.totalElements; 
        this.stock = append ? [...this.stock, ...data.content] : data.content;
        this.initialLoadComplete = true;
        this.isLoading = false;
        this.suggestions = []; 
      },
      error: (err) => {
        console.error(err);
        this.initialLoadComplete = true;
        this.isLoading = false;
      }
    });
  }

  handleTyping(text: string) {
    if (text.length > 1) {
      this.isSuggestionLoading = true;
      this.searchSubject.next(text);
    } else {
      this.suggestions = [];
      this.isSuggestionLoading = false;
    }
  }

  private performSuggestionSearch(text: string) {
    const req = { searchText: text, size: 5, filters: { "user.id": this.userId.toString() } };
    this.authService.searchStock(req).subscribe({
      next: (data) => { this.suggestions = data.content; this.isSuggestionLoading = false; },
      error: () => { this.suggestions = []; this.isSuggestionLoading = false; }
    });
  }

  handleSearch(eventData: any) {
    this.currentPage = 0;
    if (typeof eventData === 'string') {
      this.searchText = eventData;
    } else {
      this.searchText = eventData.product.name;
    }
    this.isSearchActive = this.searchText.trim().length > 0;
    this.isLoading = true;
    this.loadData(0, false);
  }

  loadInitialData() {
    this.currentPage = 0;
    this.stock = [];
    this.isLastPage = false;
    this.loadData(0, false);
  }

  handleFilterSort(event: { sortBy: string | null, direction: 'asc' | 'desc' }) {
    this.sortColumn = event.sortBy;
    this.sortDirection = event.direction;
    this.loadInitialData(); 
  }

  onDoubleClickSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.loadInitialData();
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadData(page, false);
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): number[] {
    const pages = [];
    let start = Math.max(0, this.currentPage - 1);
    let end = Math.min(this.totalPages - 1, start + 2);
    
    if (end - start < 2) {
      start = Math.max(0, end - 2);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.scrollThrottleTimeout) return;
    this.scrollThrottleTimeout = setTimeout(() => {
      this.scrollThrottleTimeout = null;
      this.checkScrollPosition();
    }, 150);
  }

  private checkScrollPosition() {
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
      if (pos > document.documentElement.scrollHeight - 100) {
        this.loadData(this.currentPage + 1, true);
      }
    }
  }

  resetView() {
    this.sortColumn = 'expiryDate';
    this.sortDirection = 'asc';
    this.searchText = '';
    this.isSearchActive = false;
    this.isLoading = true;
    this.loadInitialData(); 
  }

  edit(stockId: number) {
    this.router.navigate(['user/stock/edit', stockId]);
  }

  openDeleteModal(stockId: number) {
    this.stockToDeleteId = stockId;
    this.showDeleteModal = true;
    document.body.classList.add('modal-open');
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.stockToDeleteId = null;
    document.body.classList.remove('modal-open');
  }

  deleteStock() {
    if (!this.stockToDeleteId) return;

    this.authService.deleteStock(this.stockToDeleteId).subscribe({
      next: () => {
        this.stock = this.stock.filter(s => s.id !== this.stockToDeleteId);
        this.closeDeleteModal();
        this.loadInventoryValue(true);
      },
      error: () => {
        alert('Failed to delete stock');
        this.closeDeleteModal();
      }
    });
  }

  isExpired(dateString: string): boolean {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate < today;
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // 4. Update your click handler to use .closest() for bulletproof element matching
  handleLogClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const billLink = target.closest('.bill-link');

    if (billLink) {
      const billId = billLink.getAttribute('data-bill-id');
      if (billId) {
        this.openBill(billId);
      }
    }
  }

  openBill(billId: any): void {
    this.userStorageService.saveBillId(billId);
    this.router.navigate(['user/bill-preview']);
  }

  openLogModal(stockId: number, event?: Event) {
    if (event) event.stopPropagation(); // Prevents grid/row expansion behaviors
    
    this.showLogModal = true;
    this.isLoadingLogs = true;
    document.body.classList.add('modal-open');

    this.authService.getStockHistory(stockId).subscribe({
      next: (logs: any[]) => {
        this.currentStockLogs = logs || [];
        this.isLoadingLogs = false;
      },
      error: (err) => {
        console.error('Failed to fetch stock timeline history tracking:', err);
        this.currentStockLogs = [];
        this.isLoadingLogs = false;
      }
    });
  }

  closeLogModal() {
    this.showLogModal = false;
    this.currentStockLogs = [];
    document.body.classList.remove('modal-open');
  }
}