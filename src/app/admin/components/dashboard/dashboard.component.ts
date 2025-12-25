import { Component, OnInit,HostListener } from '@angular/core';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { Router } from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faPencil,faArrowLeft,faCapsules } from '@fortawesome/free-solid-svg-icons';
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
  faCapsules = faCapsules;
  productList: any[] = [];
  isSearchActive: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  pageSize: number = 20;
  initialLoadComplete = false;
  isLoading: boolean = false;
  isLastPage: boolean = false;
  products: any;
  userId!: any;
  expandedIndex: number | null = null;
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterColumns = [
    { label: 'Product Name', value: 'name' },
    { label: 'Packing', value: 'packing' },
    { label: 'HSN', value: 'HSN' },
    { label: 'MRP', value: 'MRP' },
    { label: 'CGST', value: 'CGST' },
    { label: 'SGST', value: 'SGST' },
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

  get isInitialEmpty(): boolean {
    return !this.isLoading && this.productList.length === 0 && !this.isSearchActive;
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

    if (!append && page === 0) {
      this.productList = [];
    }

    const searchRequest = {
      page: page,
      size: this.pageSize,
      sortBy: this.sortColumn || 'id', 
      direction: this.sortDirection,
      searchText: this.searchText,  
      filters: { "user.id": this.userId.toString() }
    };

    this.authService.searchProducts(searchRequest).subscribe({
      next: (data: any) => {
        this.totalPages = data.totalPages;
        this.isLastPage = data.last;
        this.currentPage = data.number;
        this.productList = append ? [...this.productList, ...data.content] : data.content;
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
      // Call search API with small size for suggestions
      const req = { 
        searchText: text, 
        size: 5, 
        filters: { "user.id": this.userId.toString() } 
      };
      this.authService.searchProducts(req).subscribe(data => this.suggestions = data.content);
    } else {
      this.suggestions = [];
    }
  }

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

  loadInitialData() {
    this.currentPage = 0;
    this.productList = [];
    this.isLastPage = false;
    this.loadData(0, false);
  }

  handleFilterSort(event: { sortBy: string | null, direction: 'asc' | 'desc' }) {
    this.sortColumn = event.sortBy;
    this.sortDirection = event.direction;
    // this.isSearchActive = true;
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

  getProducts(userId:any) {
    this.authService.getProducts().subscribe((data) => {
      this.products = data;
      console.log(data);
    });
  }

  delete(productId: any) {
    this.authService.deleteProduct(productId).subscribe(() => {
      console.log("Deleted Product Successfully");
      // Remove the deleted product from the 'products' array
      this.productList = this.productList.filter((product: any) => product.id !== productId);
    });
  }

  edit(productId: any){
    this.userStorageService.saveProductId(productId);
    this.router.navigateByUrl("admin/edit-product");
  }
}
