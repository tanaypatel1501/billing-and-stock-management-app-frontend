import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTruckRampBox, faArrowLeft, faCalendar, faArrowRight,
  faXmark, faPlus, faRotateLeft, faSpinner,
  faCircleCheck, faCircle, faCircleHalfStroke, faTrashCan
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
import { FormsModule } from '@angular/forms';
import { PAYMENT_MODES, PaymentMode, paymentModeLabel } from 'src/app/models/bill-payment.model';
import { PurchaseBalance, PurchasePayment } from 'src/app/models/purchase-payment.model';
import { CollapsibleHeaderDirective } from 'src/app/shared/collapsible-header/collapsible-header.directive';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    SearchBarComponent,
    FilterButtonComponent,
    LoadingSpinnerComponent,
    SuppressDockDirective,
    CollapsibleHeaderDirective
  ],
  templateUrl: './purchases.component.html',
  styleUrls: ['../bills/bills.component.scss', '../bills/bill-payments.scss', './purchases.component.scss']
})
export class PurchasesComponent implements OnInit, OnDestroy {

  faTruckRampBox = faTruckRampBox; faArrowLeft = faArrowLeft; faCalendar = faCalendar;
  faArrowRight = faArrowRight; faXmark = faXmark; faPlus = faPlus;
  faRotateLeft = faRotateLeft; faSpinner = faSpinner;
  faCircleCheck = faCircleCheck; faCircle = faCircle;
  faCircleHalfStroke = faCircleHalfStroke; faTrashCan = faTrashCan;

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
  backTo: string | null = null;     // set when opened from the payables report
  initialLoadComplete = false;

  // detail popup
  selected: Purchase | null = null;
  isDetailLoading = false;
  isReverting = false;

  // payments popup
  paymentModes = PAYMENT_MODES;
  paymentModeLabel = paymentModeLabel;
  paymentPurchase: Purchase | null = null;
  paymentBalance: PurchaseBalance | null = null;
  isPaymentLoading = false;
  isSavingPayment = false;
  deletingPaymentId: number | null = null;
  maxPaymentDate = '';
  payForm: { amount: number | null; paymentDate: string; mode: PaymentMode; reference: string; notes: string } = {
    amount: null, paymentDate: '', mode: 'CASH', reference: '', notes: ''
  };

  private debouncedSearch = new DebouncedSearch(text => this.performSuggestionSearch(text), 250);
  private scrollThrottle = new ScrollThrottle(() => this.checkScrollPosition(), 150);

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Opened from the payables report: show one supplier's purchases, with a back arrow to the report
    const q = this.route.snapshot.queryParamMap;
    const presetSearch = q.get('searchText');
    if (presetSearch) {
      this.searchText = presetSearch;
    }
    if (q.get('from') === 'outstanding-payables') {
      this.backTo = '/user/outstanding?tab=payables';
    }
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
    if (this.backTo) {
      this.router.navigateByUrl(this.backTo);
      return;
    }
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
      `Revert invoice ${p.supplierInvoiceNo} from ${p.supplierName}?\nThis removes the purchased stock and \n𝗖𝗔𝗡𝗡𝗢𝗧 𝗕𝗘 𝗨𝗡𝗗𝗢𝗡𝗘.`
        + ((p.paidAmount ?? 0) > 0
          ? `\n₹${this.formatInr(p.paidAmount ?? 0)} is recorded as paid; the money is not refunded automatically.`
          : ''),
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
        this.requestCache.invalidateMany(['purchases:', 'stock:', 'inventory-value:', 'stockLogs:', 'sales:gst:']);
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

  /* ---------- Payments ---------- */
  paymentStatus(p: Purchase): 'UNPAID' | 'PARTIAL' | 'PAID' {
    return p.paymentStatus ?? 'UNPAID';
  }

  chipLabel(p: Purchase): string {
    if (p.paymentStatus === 'PARTIAL') {
      return `₹${this.formatInr(p.paidAmount ?? 0)} paid · ₹${this.formatInr(p.outstandingAmount ?? 0)} due`;
    }
    return p.paymentStatus === 'PAID' ? 'Paid' : 'Record payment';
  }

  formatInr(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  }

  private todayStr(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private balanceFrom(p: Purchase): PurchaseBalance {
    return {
      purchaseId: p.id!,
      totalAmount: p.totalAmount ?? 0,
      paidAmount: p.paidAmount ?? 0,
      outstandingAmount: p.outstandingAmount ?? 0,
      status: p.paymentStatus ?? 'UNPAID',
      payments: p.payments ?? null
    };
  }

  openPayments(p: Purchase, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.paymentPurchase = p;
    this.paymentBalance = this.balanceFrom(p);     // summary shows at once; the payment list follows
    this.maxPaymentDate = this.todayStr();
    this.resetPayForm(this.paymentBalance);
    this.isPaymentLoading = true;
    this.authService.getPurchaseById(p.id!).subscribe({
      next: full => {
        this.isPaymentLoading = false;
        this.applyBalance(this.balanceFrom(full));
      },
      error: (err) => {
        this.isPaymentLoading = false;
        this.closePayments();
        this.alertService.error(err?.error?.message || 'Failed to load payments.');
      }
    });
  }

  closePayments(): void {
    this.paymentPurchase = null;
    this.paymentBalance = null;
    this.isSavingPayment = false;
    this.deletingPaymentId = null;
  }

  private applyBalance(b: PurchaseBalance): void {
    const patch = (x: Purchase) => {
      x.paidAmount = b.paidAmount;
      x.outstandingAmount = b.outstandingAmount;
      x.paymentStatus = b.status;
      if (b.payments) x.payments = b.payments;
    };
    const row = this.purchases.find(x => x.id === b.purchaseId);
    if (row) patch(row);
    if (this.selected?.id === b.purchaseId) patch(this.selected);
    if (this.paymentPurchase?.id === b.purchaseId) {
      this.paymentBalance = b;
      this.resetPayForm(b);
    }
  }

  private resetPayForm(b: PurchaseBalance | null): void {
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
    if (!this.paymentPurchase || !this.paymentBalance || this.isSavingPayment) return;

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

    this.isSavingPayment = true;
    this.authService.addPurchasePayment(this.paymentPurchase.id!, {
      amount,
      paymentDate: this.payForm.paymentDate,
      mode: this.payForm.mode,
      reference: this.payForm.reference.trim() || undefined,
      notes: this.payForm.notes.trim() || undefined
    }).subscribe({
      next: (b) => {
        this.isSavingPayment = false;
        this.applyBalance(b);
        this.requestCache.invalidateMany(['purchases:']);
        this.alertService.success('Payment recorded.');
      },
      error: (err) => {
        this.isSavingPayment = false;
        this.alertService.error(err?.error?.message || 'Failed to record payment.');
      }
    });
  }

  confirmDeletePayment(pay: PurchasePayment): void {
    const when = new Date(pay.paymentDate + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    this.alertService.confirm(
      `Remove the ₹${this.formatInr(pay.amount)} payment (${paymentModeLabel(pay.mode)}, ${when})?`,
      () => this.deletePayment(pay),
      'Remove Payment',
      () => {},
      'error'
    );
  }

  private deletePayment(pay: PurchasePayment): void {
    if (!this.paymentPurchase) return;
    this.deletingPaymentId = pay.id;
    this.authService.deletePurchasePayment(this.paymentPurchase.id!, pay.id).subscribe({
      next: (b) => {
        this.deletingPaymentId = null;
        this.applyBalance(b);
        this.requestCache.invalidateMany(['purchases:']);
      },
      error: (err) => {
        this.deletingPaymentId = null;
        this.alertService.error(err?.error?.message || 'Failed to remove payment.');
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