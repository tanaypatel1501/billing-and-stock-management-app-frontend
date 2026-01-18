import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faArrowLeft, faMoneyBillTrendUp, faFileInvoice, faCalendar, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { CommonModule,DatePipe } from '@angular/common'; 
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';

@Component({
  selector: 'app-bills',
  standalone: true,     
  imports: [
    CommonModule,             
    SearchBarComponent, 
    FilterButtonComponent,        
    FontAwesomeModule
  ],
  providers: [DatePipe],
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.scss']
})
export class BillsComponent implements OnInit {
  bills: any[] = [];
  userId!: any;
  billId!: any;
  faArrowLeft = faArrowLeft;
  faMoneyBillTrendUp = faMoneyBillTrendUp;
  faFileInvoice = faFileInvoice;
  faCalendar = faCalendar;
  faArrowRight = faArrowRight;
  isSearchActive: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  pageSize: number = 12;
  isLoading: boolean = false;
  isLastPage: boolean = false;
  expandedIndex: number | null = null;
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterColumns = [
    { label: 'To', value: 'purchaserName' },
    { label: 'Invoice Date', value: 'invoiceDate' },
  ];
  searchText: string = '';
  suggestions: any[] = [];
  initialLoadComplete: boolean = false;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private datePipe: DatePipe
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.loadInitialData();
  }

  get isInitialEmpty(): boolean {
    return (
      this.initialLoadComplete &&
      !this.isLoading &&
      this.bills.length === 0 &&
      !this.isSearchActive &&
      !this.sortColumn
    );
  }

  private buildSuggestions(source: any[]): void {
    this.suggestions = source.map(bill => ({
      ...bill,
      invoiceDateFormatted: this.datePipe.transform(
        bill.invoiceDate,
        'dd MMM yyyy'
      )
    }));
  }

  loadData(page: number = 0, append: boolean = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    if (!append && page === 0) {
      this.bills = [];
    }

    const searchRequest = {
      page: page,
      size: this.pageSize,
      sortBy: this.sortColumn || 'id', 
      direction: this.sortDirection,
      searchText: this.searchText,  
      filters: { "user.id": this.userId.toString() }
    };

    this.authService.searchBills(searchRequest).subscribe({
      next: (data: any) => {
        this.totalPages = data.totalPages;
        this.isLastPage = data.last;
        this.currentPage = data.number;
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
      const req = { 
        searchText: text, 
        size: 5, 
        filters: { "user.id": this.userId.toString() } 
      };
      this.authService.searchBills(req).subscribe(data => this.buildSuggestions(data.content));
    } else {
      this.suggestions = [];
    }
  }

  loadInitialData() {
    this.currentPage = 0;
    this.bills = [];
    this.isLastPage = false;
    this.loadData(0, false);
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

  handleFilterSort(event: { sortBy: string | null, direction: 'asc' | 'desc' }) {
    this.sortColumn = event.sortBy;
    this.sortDirection = event.direction;
    // this.isSearchActive = true;
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
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading && this.initialLoadComplete) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
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
    this.loadInitialData(); 
  }

  openBill(billId: any) {
    this.userStorageService.saveBillId(billId);
    this.router.navigate(['user/bill-preview']);
  }
}