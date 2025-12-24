import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { Router } from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faPencil,faArrowLeft,faCartFlatbed } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common'; 
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FilterButtonComponent } from 'src/app/shared/filter-button/filter-button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,           
  imports: [
    CommonModule,             
    SearchBarComponent, 
    FilterButtonComponent,        
    FontAwesomeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit{
  faTrashCan = faTrashCan;
  faPencil = faPencil;
  faArrowLeft = faArrowLeft;
  faCartFlatbed = faCartFlatbed;
  stock: any[] = [];
  isSearchActive: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  pageSize: number = 20;
  isLoading: boolean = false;
  isLastPage: boolean = false;
  userId!: any;
  expandedIndex: number | null = null;
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterColumns = [
    { label: 'Product Name', value: 'product.name' },
    { label: 'Packing', value: 'product.packing' },
    { label: 'HSN', value: 'product.HSN' },
    { label: 'Batch No.', value: 'batchNo' },
    { label: 'Expiry Date', value: 'expiryDate' },
    { label: 'Quantity', value: 'quantity' },
    { label: 'MRP', value: 'product.MRP' },
    { label: 'CGST', value: 'product.CGST' },
    { label: 'SGST', value: 'product.SGST' },
  ];
  searchText: string = '';
  suggestions: any[] = [];

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.loadInitialData();
  }

  toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

  loadData(page: number = 0, append: boolean = false) {
  if (this.isLoading) return;
  this.isLoading = true;

  const searchRequest = {
    page: page,
    size: this.pageSize,
    sortBy: this.sortColumn || 'id', // Default to ID if no sort selected
    direction: this.sortDirection,
    searchText: this.searchText,    // Unified search text
    filters: { "user.id": this.userId.toString() }
  };

  this.authService.searchStock(searchRequest).subscribe({
    next: (data: any) => {
      this.totalPages = data.totalPages;
      this.isLastPage = data.last;
      this.currentPage = data.number;
      this.stock = append ? [...this.stock, ...data.content] : data.content;
      this.isLoading = false;
      this.suggestions = []; 
    },
    error: (err) => {
      console.error(err);
      this.isLoading = false;
    }
  });
}

// Handler for typing (Live Suggestions)
handleTyping(text: string) {
  if (text.length > 1) {
    // Call search API with small size for suggestions
    const req = { 
      searchText: text, 
      size: 5, 
      filters: { "user.id": this.userId.toString() } 
    };
    this.authService.searchStock(req).subscribe(data => this.suggestions = data.content);
  } else {
    this.suggestions = [];
  }
}

// Handler for executing search (Enter or Selection)
handleSearch(eventData: any) {
  this.currentPage = 0;
  if (typeof eventData === 'string') {
    this.searchText = eventData;
  } else {
    this.searchText = eventData.product.name;
  }
  this.isSearchActive = this.searchText.trim().length > 0;
  this.loadData(0, false);
}

// Refactor existing triggers to use loadData
loadInitialData() {
  this.currentPage = 0;
  this.stock = [];
  this.isLastPage = false;
  this.loadData(0, false);
}

handleFilterSort(event: { sortBy: string | null, direction: 'asc' | 'desc' }) {
  this.sortColumn = event.sortBy;
  this.sortDirection = event.direction;
  this.isSearchActive = true;
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
  if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading) {
    const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
    if (pos > document.documentElement.scrollHeight - 100) {
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
  delete(productId: any) {
    this.authService.deleteProduct(productId).subscribe(() => {
      console.log("Deleted Product Successfully");
      // Remove the deleted product from the 'products' array
      this.stock = this.stock.filter((product: any) => product.id !== productId);
    });
  }

  edit(productId: any){
    this.userStorageService.saveProductId(productId);
    this.router.navigateByUrl("user/edit-product");
  }
}
