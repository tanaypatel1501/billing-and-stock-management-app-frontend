import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute,Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import {
  faArrowLeft, faMoneyBillTrendUp, faFileInvoice, faCalendar,
  faArrowRight, faCircleCheck, faCircle, faCheckSquare, faDownload, faSpinner, faTimes, faRotateLeft, faShare,
  faTrashCan, faCircleHalfStroke
} from '@fortawesome/free-solid-svg-icons';
import { CommonModule, DatePipe } from '@angular/common';
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { DebouncedSearch } from 'src/app/shared/utils/debounced-search';
import { ScrollThrottle } from 'src/app/shared/utils/scroll-throttle';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CollapsibleHeaderDirective } from 'src/app/shared/collapsible-header/collapsible-header.directive';
import { FormsModule } from '@angular/forms';
import { SuppressDockDirective } from 'src/app/shared/suppress-dock/suppress-dock.directive';
import {
  BillBalance, BillPayment, BillPaymentStatus, PAYMENT_MODES, PaymentMode, paymentModeLabel
} from 'src/app/models/bill-payment.model';

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBarComponent, FilterButtonComponent, FontAwesomeModule, LoadingSpinnerComponent, CollapsibleHeaderDirective, SuppressDockDirective],
  providers: [DatePipe],
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.scss', './bill-payments.scss']
})
export class BillsComponent implements OnInit, OnDestroy {
  bills: any[] = [];
  userId!: any;
  billId!: any;
  purchaserId: number | null = null;
  purchaserName: string = '';

  faArrowLeft = faArrowLeft;
  faMoneyBillTrendUp = faMoneyBillTrendUp;
  faFileInvoice = faFileInvoice;
  faCalendar = faCalendar;
  faArrowRight = faArrowRight;
  faCircleCheck = faCircleCheck;
  faCircle = faCircle;
  faCheckSquare = faCheckSquare;
  faDownload = faDownload;
  faSpinner = faSpinner;
  faTimes = faTimes;
  faRotateLeft = faRotateLeft;
  faShare = faShare;
  faTrashCan = faTrashCan;
  faCircleHalfStroke = faCircleHalfStroke;

  isSearchActive: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  totalElements: number = 0;
  pageSize: number = 12;
  isLoading: boolean = true;
  isSuggestionLoading: boolean = false;
  isLastPage: boolean = false;
  expandedIndex: number | null = null;
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterColumns = [
    { label: 'To', value: 'purchaserName' },
    { label: 'Invoice Date', value: 'invoiceDate' },
    { label: 'Payment Status', value: 'paid' }
  ];
  searchText: string = '';
  suggestions: any[] = [];
  initialLoadComplete: boolean = false;

  // Selection & export state
  selectedBillIds: Set<number> = new Set();
  isExporting: boolean = false;
  fromDate: string = '';
  toDate: string = '';
  selectAllPages: boolean = false;
  isReverting = false;
  isSharing = false;

  cameFromPurchaser: boolean = false;
  backTo: string | null = null;
  // Payments
  balances: Record<number, BillBalance> = {};
  paymentModes = PAYMENT_MODES;
  paymentModeLabel = paymentModeLabel;
  paymentBill: any | null = null;          // the bill whose popup is open
  paymentBalance: BillBalance | null = null;
  isPaymentLoading = false;
  isSavingPayment = false;
  deletingPaymentId: number | null = null;
  maxPaymentDate = '';
  payForm: { amount: number | null; paymentDate: string; mode: PaymentMode; reference: string; notes: string } = {
    amount: null, paymentDate: '', mode: 'CASH', reference: '', notes: ''
  };

  private debouncedSearch = new DebouncedSearch(text => this.performSuggestionSearch(text), 250);
  private scrollThrottle = new ScrollThrottle(() => this.checkScrollPosition(), 150);
  private exportStartedAt = 0;
  private readonly minInfoDisplayMs = 1200;
  private isLoadingMore: boolean = false;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private datePipe: DatePipe,
    private requestCache: RequestCacheService,
    private alertService: AlertService,
    private appState: AppStateService
  ) {}

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    const paramPurchaserId = this.route.snapshot.queryParamMap.get('purchaserId');
    const paramPurchaserName = this.route.snapshot.queryParamMap.get('purchaserName');
    const paramSearch = this.route.snapshot.queryParamMap.get('searchText');
    const savedState = this.appState.consumeBillsListState();
    this.backTo = this.route.snapshot.queryParamMap.get('from') === 'outstanding' ? '/user/outstanding' : null;

    if (paramPurchaserId) {
      this.purchaserId   = +paramPurchaserId;
      this.purchaserName = paramPurchaserName ?? '';
      this.searchText    = this.purchaserName;
      this.isSearchActive = true;
      this.cameFromPurchaser = true;
      this.loadInitialData();
    } else if (paramSearch) {
      this.searchText    = paramSearch;
      this.isSearchActive = true;
      this.loadInitialData();
    } else if (savedState) {
      this.currentPage       = savedState.currentPage;
      this.searchText        = savedState.searchText;
      this.isSearchActive    = savedState.isSearchActive;
      this.sortColumn        = savedState.sortColumn;
      this.sortDirection     = savedState.sortDirection;
      this.fromDate           = savedState.fromDate;
      this.toDate             = savedState.toDate;
      this.purchaserId       = savedState.purchaserId;
      this.purchaserName     = savedState.purchaserName;
      this.cameFromPurchaser = savedState.cameFromPurchaser;
      this.backTo            = savedState.backTo ?? null;
      this.bills = [];
      this.isLastPage = false;
      if (window.innerWidth < 768) {

      this.restoreInfiniteScrollUpTo(savedState.currentPage, () => {
        requestAnimationFrame(() => window.scrollTo(0, savedState.scrollY));
      });
    } else {
      this.loadData(this.currentPage, false, () => {
        requestAnimationFrame(() => window.scrollTo(0, savedState.scrollY));
      });
    }
  } else {
    this.loadInitialData();
  }
}

  ngOnDestroy(): void {
    this.debouncedSearch.destroy();
    this.scrollThrottle.destroy();
  }

  trackByBillId(index: number, bill: any): number {
    return bill.id;
  }

  private restoreInfiniteScrollUpTo(targetPage: number, onComplete: () => void): void {
    const loadNext = (page: number) => {
      this.loadData(page, page > 0, () => {
        if (page < targetPage && !this.isLastPage) {
          loadNext(page + 1);
        } else {
          onComplete();
        }
      });
    };
    loadNext(0);
  }

  goBack(): void {
    if (this.backTo) {
      this.router.navigate([this.backTo]);
      return;
    }
    if (this.cameFromPurchaser) {
      this.router.navigate(['/user/purchasers']);
    } else {
      this.resetView();
    }
  }

  get isInitialEmpty(): boolean {
    return (
      this.initialLoadComplete &&
      !this.isLoading &&
      this.bills.length === 0 &&
      !this.isSearchActive &&
      !this.sortColumn &&
      !this.fromDate &&   
      !this.toDate  
    );
  }

  private buildSuggestions(source: any[]): void {
    this.suggestions = source.map(bill => ({
      ...bill,
      invoiceDateFormatted: this.datePipe.transform(bill.invoiceDate, 'dd MMM yyyy')
    }));
  }

  loadInitialData() {
    this.currentPage = 0;
    this.bills = [];
    this.isLastPage = false;
    this.loadData(0, false);
  }

  loadData(page: number = 0, append: boolean = false, onComplete?: () => void) {
    if (append) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
      if (page === 0) {
        this.bills = [];
      }
    }

    const searchRequest = {
      page: page,
      size: this.pageSize,
      sortBy: this.sortColumn || 'id',
      direction: this.sortDirection,
      searchText: this.purchaserId ? '' : this.searchText,
      purchaserId: this.purchaserId ?? undefined,
      filters: {
        'user.id': this.userId.toString(),
        ...(this.fromDate ? { 'invoiceDate.from': this.fromDate } : {}),
        ...(this.toDate   ? { 'invoiceDate.to':   this.toDate   } : {})
      }
    };

    const cacheKey = `bills:${this.userId}:${JSON.stringify(searchRequest)}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.applyBillsPage(cached, append);
      onComplete?.();
      return;
    }

    this.authService.searchBills(searchRequest).subscribe({
      next: (data: any) => {
        this.requestCache.set(cacheKey, data);
        this.applyBillsPage(data, append);
        onComplete?.();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.isLoadingMore = false;
        this.initialLoadComplete = true;
        onComplete?.();
      }
    });
  }

  private applyBillsPage(data: any, append: boolean): void {
    this.totalPages = data.totalPages;
    this.isLastPage = data.last;
    this.currentPage = data.number;
    this.totalElements = data.totalElements;

    if (append && this.bills.length > 0) {
      const billMap = new Map();
      this.bills.forEach(b => billMap.set(b.id, b));
      data.content.forEach((b: any) => billMap.set(b.id, b)); 
      this.bills = Array.from(billMap.values());
    } else {
      this.bills = data.content;
    }

    this.isLoading = false;
    this.isLoadingMore = false; 
    this.initialLoadComplete = true;
    this.suggestions = [];
    this.loadBalances(data.content.map((b: any) => b.id));
  }

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
    const req = { searchText: text, size: 5, filters: { 'user.id': this.userId.toString() } };
    this.authService.searchBills(req).subscribe({
      next: (data) => { this.buildSuggestions(data.content); this.isSuggestionLoading = false; },
      error: () => { this.suggestions = []; this.isSuggestionLoading = false; }
    });
  }

  handleSearch(eventData: any) {
    this.currentPage = 0;
    this.isLastPage = false;
    this.isLoadingMore = false;
    
    if (typeof eventData === 'string') {
      this.searchText = eventData;
    } else {
      this.searchText = eventData.purchaserName || eventData.invoiceDate || '';
    }
    this.isSearchActive = this.searchText.trim().length > 0;
    this.loadData(0, false);
  }

  handleFilterSort(event: {
    sortBy: string | null;
    direction: 'asc' | 'desc';
    action?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    this.sortColumn = event.sortBy;
    this.sortDirection = event.direction;
    this.fromDate = event.fromDate ?? '';
    this.toDate   = event.toDate   ?? '';
    this.currentPage = 0;
    this.isLastPage = false;
    this.isLoadingMore = false;
    this.loadInitialData();
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.selectAllPages = false;
      this.loadData(page, false);
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): number[] {
    const pages = [];
    let start = Math.max(0, this.currentPage - 1);
    let end   = Math.min(this.totalPages - 1, start + 2);
    if (end - start < 2) start = Math.max(0, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.isLoadingMore && !this.isLoading) {
      this.scrollThrottle.trigger();
    }
  }

  private checkScrollPosition() {
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading && !this.isLoadingMore && this.initialLoadComplete) {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const offsetHeight = document.documentElement.offsetHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      
      // Trigger when within 200px of the bottom
      if (scrollTop + offsetHeight >= scrollHeight - 200) {
        this.isLoadingMore = true; // immediately lock
        this.loadData(this.currentPage + 1, true);
      }
    }
  }

  resetView() {
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.searchText = '';
    this.isSearchActive = false;
    this.fromDate = '';
    this.toDate = '';
    this.purchaserId   = null;   
    this.purchaserName = '';
    this.loadInitialData();
  }

  // ── Payments ──
  private loadBalances(ids: number[]): void {
    if (!ids || ids.length === 0) return;
    this.authService.getBillBalances(ids).subscribe({
      next: (list) => list.forEach(b => { this.balances[b.billId] = b; }),
      error: () => { /* chips fall back to the bill.paid flag */ }
    });
  }

  paymentStatus(bill: any): BillPaymentStatus {
    const b = this.balances[bill.id];
    if (b) return b.status;
    return bill.paid ? 'PAID' : 'UNPAID';
  }

  chipLabel(bill: any): string {
    const b = this.balances[bill.id];
    if (b && b.status === 'PARTIAL') {
      return `₹${this.formatInr(b.paidAmount)} paid · ₹${this.formatInr(b.outstandingAmount)} due`;
    }
    return this.paymentStatus(bill) === 'PAID' ? 'Paid' : 'Record payment';
  }

  formatInr(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  }

  private todayStr(): string {
    return this.datePipe.transform(new Date(), 'yyyy-MM-dd') ?? '';
  }

  openPayments(bill: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.paymentBill = bill;
    this.paymentBalance = this.balances[bill.id] ?? null;   // summary shows at once; the payment list follows
    this.maxPaymentDate = this.todayStr();
    this.resetPayForm(this.paymentBalance);
    this.isPaymentLoading = true;
    this.authService.getBillBalance(bill.id).subscribe({
      next: (b) => {
        this.isPaymentLoading = false;
        this.applyBalance(bill.id, b);
      },
      error: (err) => {
        this.isPaymentLoading = false;
        this.closePayments();
        this.alertService.error(err?.error?.message || 'Failed to load payments.');
      }
    });
  }

  closePayments(): void {
    this.paymentBill = null;
    this.paymentBalance = null;
    this.isSavingPayment = false;
    this.deletingPaymentId = null;
  }

  private applyBalance(billId: number, b: BillBalance): void {
    this.balances[billId] = b;
    const bill = this.bills.find(x => x.id === billId);
    if (bill) bill.paid = b.status === 'PAID';
    if (this.paymentBill?.id === billId) {
      this.paymentBalance = b;
      this.resetPayForm(b);
    }
  }

  private resetPayForm(b: BillBalance | null): void {
    this.payForm = {
      amount: b && b.outstandingAmount > 0 ? b.outstandingAmount : null,
      paymentDate: this.todayStr(),
      mode: 'CASH',
      reference: '',
      notes: ''
    };
  }

  payFullBalance(): void {
    if (this.paymentBalance && this.paymentBalance.outstandingAmount > 0) {
      this.payForm.amount = this.paymentBalance.outstandingAmount;
    }
  }

  savePayment(): void {
    if (!this.paymentBill || !this.paymentBalance || this.isSavingPayment) return;

    const amount = Number(this.payForm.amount);
    if (!amount || amount <= 0) {
      this.alertService.error('Enter an amount greater than 0.');
      return;
    }
    if (amount > this.paymentBalance.outstandingAmount + 0.005) {
      this.alertService.error(`Amount cannot exceed the outstanding ₹${this.formatInr(this.paymentBalance.outstandingAmount)}.`);
      return;
    }
    if (!this.payForm.paymentDate) {
      this.alertService.error('Choose the payment date.');
      return;
    }

    const billId = this.paymentBill.id;
    this.isSavingPayment = true;
    this.authService.addBillPayment(billId, {
      amount,
      paymentDate: this.payForm.paymentDate,
      mode: this.payForm.mode,
      reference: this.payForm.reference.trim() || undefined,
      notes: this.payForm.notes.trim() || undefined
    }).subscribe({
      next: (b) => {
        this.isSavingPayment = false;
        this.applyBalance(billId, b);
        this.requestCache.invalidateMany(['sales:', 'bills:']);
        this.alertService.success('Payment recorded.');
      },
      error: (err) => {
        this.isSavingPayment = false;
        this.alertService.error(err?.error?.message || 'Failed to record payment.');
      }
    });
  }

  confirmDeletePayment(p: BillPayment): void {
    this.alertService.confirm(
      `Remove the ₹${this.formatInr(p.amount)} payment (${paymentModeLabel(p.mode)}, ${this.datePipe.transform(p.paymentDate, 'dd MMM yyyy')})?`,
      () => this.deletePayment(p),
      'Remove Payment',
      () => {},
      'error'
    );
  }

  private deletePayment(p: BillPayment): void {
    if (!this.paymentBill) return;
    const billId = this.paymentBill.id;
    this.deletingPaymentId = p.id;
    this.authService.deleteBillPayment(billId, p.id).subscribe({
      next: (b) => {
        this.deletingPaymentId = null;
        this.applyBalance(billId, b);
        this.requestCache.invalidateMany(['sales:', 'bills:']);
      },
      error: (err) => {
        this.deletingPaymentId = null;
        this.alertService.error(err?.error?.message || 'Failed to remove payment.');
      }
    });
  }

  openBill(billId: any) {
     this.appState.saveBillsListState({
      currentPage: this.currentPage,
      scrollY: window.scrollY,
      searchText: this.searchText,
      isSearchActive: this.isSearchActive,
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection,
      fromDate: this.fromDate,
      toDate: this.toDate,
      purchaserId: this.purchaserId,
      purchaserName: this.purchaserName,
      cameFromPurchaser: this.cameFromPurchaser,
      backTo: this.backTo
    });
    this.userStorageService.saveBillId(billId);
    this.router.navigate(['user/bill-preview']);
  }

  toggleBillSelection(billId: number, event: Event): void {
    event.stopPropagation();
    if (this.selectedBillIds.has(billId)) {
      this.selectedBillIds.delete(billId);
    } else {
      this.selectedBillIds.add(billId);
    }
  }

  isSelected(billId: number): boolean {
    return this.selectedBillIds.has(billId);
  }

  get allCurrentPageSelected(): boolean {
    return this.bills.length > 0 && this.bills.every(b => this.selectedBillIds.has(b.id));
  }

  get allSelected(): boolean {
    return this.selectAllPages;
  }

  get isDateFilterActive(): boolean {
    return !!this.fromDate || !!this.toDate;
  }

  get hasSelection(): boolean {
    return this.selectedBillIds.size > 0 || this.selectAllPages;
  }

  toggleSelectAll(): void {
    if (this.selectAllPages || this.allCurrentPageSelected) {
      // Currently selected (either mode) — clicking again deselects everything
      this.selectAllPages = false;
      this.selectedBillIds.clear();
    } else {
      // Select everything across all pages in one click
      this.selectAllPages = true;
      this.bills.forEach(b => this.selectedBillIds.add(b.id)); // keep current page's ids too, for immediate UI feedback
    }
  }

    clearSelection(): void {
    this.selectAllPages = false;
    this.selectedBillIds.clear();
  }

  selectAllBills(): void {
    this.selectAllPages = true;
    this.bills.forEach(b => this.selectedBillIds.add(b.id));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.paymentBill) {
      this.closePayments();
      return;
    }
    if (this.selectedBillIds.size > 0 || this.selectAllPages) {
      this.clearSelection();
    }
  }

  // ── Revert ──
  confirmRevertBill(): void {
    if (this.selectedBillIds.size !== 1) return;
    const billId = Array.from(this.selectedBillIds)[0];
    const bill = this.bills.find(b => b.id === billId);
    const label = bill
  ? `${bill.purchaserName} \n(${this.datePipe.transform(bill.invoiceDate, 'dd MMM yyyy')},Invoice No: ${bill.id})`
  : `Invoice No: #${billId}`;

    this.alertService.confirm(
      `Revert bill for ${label} ?\nThis restores stock quantities and \n𝗖𝗔𝗡𝗡𝗢𝗧 𝗕𝗘 𝗨𝗡𝗗𝗢𝗡𝗘.`,
      () => this.revertBill(billId),
      'Revert Bill',
      () => {},
      'error'
    );
  }

  private revertBill(billId: number): void {
    this.isReverting = true;
    this.authService.revertBill(billId).subscribe({
      next: () => {
        this.requestCache.invalidateMany(['stock:', 'inventory-value:', 'sales:', 'stockLogs:', 'bills:']);
        this.selectedBillIds.clear();
        this.isReverting = false;
        this.loadData(this.currentPage, false);
      },
      error: (err) => {
        this.isReverting = false;
        alert(err?.error?.message || 'Failed to revert bill.');
      }
    });
  }

  // ── Export ──
  exportSelectedAsPdf(): void {
    if (this.isExporting) return;
    this.isExporting = true;

    const count = this.selectAllPages ? this.totalElements : this.selectedBillIds.size;
    this.exportStartedAt = Date.now();
    this.alertService.info(
      count === 1
        ? 'Export started. You\'ll be notified once your invoice is ready.'
        : `Export started for ${count} invoices. You'll be notified once ready.`
    );

    if (this.selectAllPages) {
      const allPagesRequest = {
        page: 0,
        size: this.totalElements,
        sortBy: this.sortColumn || 'id',
        direction: this.sortDirection,
        searchText: this.searchText,
        filters: {
          'user.id': this.userId.toString(),
          ...(this.fromDate ? { 'invoiceDate.from': this.fromDate } : {}),
          ...(this.toDate   ? { 'invoiceDate.to':   this.toDate   } : {})
        }
      };
      this.authService.searchBills(allPagesRequest).subscribe({
        next: (data: any) => {
          const ids = data.content.map((b: any) => b.id);
          this.exportBills(ids);
        },
        error: () => {
          this.isExporting = false;
          this.showAfterMinDisplay(() => this.alertService.error('Failed to fetch all bills for export.'));
        }
      });
    } else {
      if (this.selectedBillIds.size === 0) { this.isExporting = false; return; }
      this.exportBills(Array.from(this.selectedBillIds));
    }
  }

  private showAfterMinDisplay(fn: () => void): void {
    const elapsed = Date.now() - this.exportStartedAt;
    const remaining = this.minInfoDisplayMs - elapsed;
    if (remaining > 0) {
      setTimeout(fn, remaining);
    } else {
      fn();
    }
  }

  /**
   * Routes to the single-PDF endpoint when exactly one bill is selected
   * (skips zip overhead entirely), otherwise uses the bulk zip endpoint.
   */
  private exportBills(ids: number[]): void {
    if (ids.length === 0) { this.isExporting = false; return; }

    if (ids.length === 1) {
      this.downloadSinglePdf(ids[0]);
    } else {
      this.downloadBillsZip(ids);
    }
  }

  private sanitizeFilename(value: string): string {
    return value
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private downloadSinglePdf(id: number): void {
    const bill = this.bills.find(b => b.id === id);

    const filename = bill
      ? `Invoice-${this.sanitizeFilename(bill.purchaserName)}-${this.datePipe.transform(bill.invoiceDate, 'dd-MM-yyyy')}.pdf`
      : `Invoice-${id}.pdf`;

    this.authService.getPdfBlob(id).subscribe({
      next: async (blob) => {
        try {
          await this.triggerDownload(blob, filename);

          this.finishExport();

          this.showAfterMinDisplay(() =>
            this.alertService.success('Invoice downloaded.')
          );
        } catch (error) {
          console.error('Failed to save exported invoice:', error);

          this.isExporting = false;

          this.showAfterMinDisplay(() =>
            this.alertService.error('Failed to save exported invoice.')
          );
        }
      },

      error: () => {
        this.isExporting = false;

        this.showAfterMinDisplay(() =>
          this.alertService.error(`Failed to export bill ID ${id}`)
        );
      }
    });
  }

  private downloadBillsZip(ids: number[]): void {
    if (ids.length === 0) {
      this.isExporting = false;
      return;
    }

    this.authService.downloadBillsZip(ids).subscribe({
      next: async (blob) => {
        try {
          await this.triggerDownload(
            blob,
            `Invoices-${this.today()}.zip`
          );

          this.finishExport();

          this.showAfterMinDisplay(() =>
            this.alertService.success(`${ids.length} invoices exported.`)
          );
        } catch (error) {
          console.error('Failed to save exported ZIP:', error);

          this.isExporting = false;

          this.showAfterMinDisplay(() =>
            this.alertService.error('Failed to save exported bills.')
          );
        }
      },

      error: () => {
        this.isExporting = false;

        this.showAfterMinDisplay(() =>
          this.alertService.error('Failed to export bills.')
        );
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  private async triggerDownload(blob: Blob, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await this.blobToBase64(blob);

      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      return;
    }

    const url = URL.createObjectURL(blob);

    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  private finishExport(): void {
    this.isExporting = false;
    this.selectAllPages = false;
    this.selectedBillIds.clear();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Share ──
  shareSelected(): void {
    if (this.isSharing || this.isExporting) return;
    this.isSharing = true;

    this.resolveSelectedIds(
      ids => this.shareBills(ids),
      () => {
        this.isSharing = false;
        this.alertService.error('Failed to fetch bills for sharing.');
      }
    );
  }

  /** Resolves ids for the current selection, including "select all pages". */
  private resolveSelectedIds(onDone: (ids: number[]) => void, onError: () => void): void {
    if (!this.selectAllPages) {
      onDone(Array.from(this.selectedBillIds));
      return;
    }

    this.authService.searchBills({
      page: 0,
      size: this.totalElements,
      sortBy: this.sortColumn || 'id',
      sortDir: this.sortDirection,
      searchText: this.searchText,
      filters: {
        'user.id': this.userId.toString(),
        ...(this.fromDate ? { 'invoiceDate.from': this.fromDate } : {}),
        ...(this.toDate   ? { 'invoiceDate.to':   this.toDate   } : {})
      }
    }).subscribe({
      next: (data: any) => onDone(data.content.map((b: any) => b.id)),
      error: onError
    });
  }

  private buildPdfFilename(id: number): string {
    const bill = this.bills.find(b => b.id === id);
    return bill
      ? `Invoice-${this.sanitizeFilename(bill.purchaserName)}-${this.datePipe.transform(bill.invoiceDate, 'dd-MM-yyyy')}.pdf`
      : `Invoice-${id}.pdf`;
  }

  private shareBills(ids: number[]): void {
    if (ids.length === 0) { this.isSharing = false; return; }

    if (ids.length === 1) {
      const id = ids[0];
      this.authService.getPdfBlob(id).subscribe({
        next: blob => this.shareBlob(blob, this.buildPdfFilename(id), 'application/pdf', 'Invoice'),
        error: () => {
          this.isSharing = false;
          this.alertService.error(`Failed to prepare bill ID ${id} for sharing.`);
        }
      });
    } else {
      this.authService.downloadBillsZip(ids).subscribe({
        next: blob => this.shareBlob(blob, `Invoices-${this.today()}.zip`, 'application/zip', `${ids.length} Invoices`),
        error: () => {
          this.isSharing = false;
          this.alertService.error('Failed to prepare bills for sharing.');
        }
      });
    }
  }

  private async shareBlob(blob: Blob, filename: string, mime: string, title: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const base64Data = await this.blobToBase64(blob);
        // Cache dir: temporary file, doesn't clutter the user's Documents
        const { uri } = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true
        });
        await Share.share({ title, url: uri, dialogTitle: 'Share' });
      } else {
        const file = new File([blob], filename, { type: mime });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title });
        } else {
          await this.triggerDownload(blob, filename);
          this.alertService.info('Sharing isn’t supported in this browser, so the file was downloaded instead.');
        }
      }
    } catch (err: any) {
      const cancelled = err?.name === 'AbortError' || err?.message === 'Share canceled';
      if (!cancelled) {
        console.error('Share failed:', err);
        this.alertService.error('Failed to share.');
      }
    } finally {
      this.isSharing = false;
    }
  }
}