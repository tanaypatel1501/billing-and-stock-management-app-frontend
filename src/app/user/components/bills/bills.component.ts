import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import {
  faArrowLeft, faMoneyBillTrendUp, faFileInvoice, faCalendar,
  faArrowRight, faCircleCheck, faCircle, faCheckSquare, faDownload, faSpinner, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { CommonModule, DatePipe } from '@angular/common';
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [CommonModule, SearchBarComponent, FilterButtonComponent, FontAwesomeModule],
  providers: [DatePipe],
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.scss']
})
export class BillsComponent implements OnInit {
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

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    const paramPurchaserId = this.route.snapshot.queryParamMap.get('purchaserId');
    const paramPurchaserName = this.route.snapshot.queryParamMap.get('purchaserName');
    const paramSearch = this.route.snapshot.queryParamMap.get('searchText');
    if (paramPurchaserId) {
      this.purchaserId   = +paramPurchaserId;
      this.purchaserName = paramPurchaserName ?? '';
      this.searchText    = this.purchaserName;  
      this.isSearchActive = true;
    } else if (paramSearch) {
      this.searchText    = paramSearch;
      this.isSearchActive = true;
    }
    this.loadInitialData();
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

  loadData(page: number = 0, append: boolean = false) {
    this.isLoading = true;
    if (!append && page === 0) {
      this.bills = [];
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

    this.authService.searchBills(searchRequest).subscribe({
      next: (data: any) => {
        this.totalPages = data.totalPages;
        this.isLastPage = data.last;
        this.currentPage = data.number;
        this.totalElements = data.totalElements;
        this.bills = append ? [...this.bills, ...data.content] : data.content;
        this.isLoading = false;
        this.initialLoadComplete = true;
        this.suggestions = [];
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.initialLoadComplete = true;
      }
    });
  }

  handleTyping(text: string) {
    if (text.length > 1) {
      this.isSuggestionLoading = true;
      const req = { searchText: text, size: 5, filters: { 'user.id': this.userId.toString() } };
      this.authService.searchBills(req).subscribe({
        next: (data) => { this.buildSuggestions(data.content); this.isSuggestionLoading = false; },
        error: () => { this.suggestions = []; this.isSuggestionLoading = false; }
      });
    } else {
      this.suggestions = [];
      this.isSuggestionLoading = false;
    }
  }

  handleSearch(eventData: any) {
    this.currentPage = 0;
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
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading && this.initialLoadComplete) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop)
                  + document.documentElement.offsetHeight;
      const max = document.documentElement.scrollHeight;
      if (pos >= max - 100) {
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

  togglePaid(bill: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const newStatus = !bill.paid;
    bill.paid = newStatus;
    bill._reqId = (bill._reqId || 0) + 1;
    const reqId = bill._reqId;
    this.authService.updateBillPaidStatus(bill.id, newStatus).subscribe({
      next: () => {},
      error: () => {
        if (bill._reqId === reqId) {
          bill.paid = !newStatus;
          alert('Failed to update payment status');
        }
      }
    });
  }

  openBill(billId: any) {
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

  toggleSelectAll(): void {
    if (this.selectAllPages) {
      // deselect everything
      this.selectAllPages = false;
      this.selectedBillIds.clear();
    } else if (this.allCurrentPageSelected) {
      // current page all selected — prompt for all-pages
      this.selectAllPages = true;
      // selectedBillIds stays — we use selectAllPages flag for export
    } else {
      // select current page
      this.bills.forEach(b => this.selectedBillIds.add(b.id));
    }
  }
  // ── Export ──

  exportSelectedAsPdf(): void {
    if (this.isExporting) return;
    this.isExporting = true;

    if (this.selectAllPages) {
      // Fetch all bill IDs matching current filters, then export
      const allPagesRequest = {
        page: 0,
        size: this.totalElements,   // fetch everything
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
          this.fetchAndExportPdfs(ids);
        },
        error: () => {
          this.isExporting = false;
          alert('Failed to fetch all bills for export.');
        }
      });
    } else {
      if (this.selectedBillIds.size === 0) { this.isExporting = false; return; }
      this.fetchAndExportPdfs(Array.from(this.selectedBillIds));
    }
  }
  private fetchAndExportPdfs(ids: number[]): void {
    if (ids.length === 0) { this.isExporting = false; return; }

    let index = 0;
    const downloadNext = () => {
      if (index >= ids.length) { this.finishExport(); return; }
      const id = ids[index++];

      // Find the bill in current page for name/date — fall back to ID if not on page
      const bill = this.bills.find(b => b.id === id);
      const filename = bill
        ? `Invoice-${bill.purchaserName}-${this.datePipe.transform(bill.invoiceDate, 'dd-MM-yyyy')}.pdf`
        : `Invoice-${id}-${this.today()}.pdf`;

      this.authService.getPdfBlob(id).subscribe({
        next: (blob) => {
          this.triggerDownload(blob, filename);
          setTimeout(downloadNext, 300);
        },
        error: () => {
          this.isExporting = false;
          alert(`Failed to export bill ID ${id}`);
        }
      });
    };
    downloadNext();
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private finishExport(): void {
    this.isExporting = false;
    this.selectAllPages = false;
    this.selectedBillIds.clear();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
