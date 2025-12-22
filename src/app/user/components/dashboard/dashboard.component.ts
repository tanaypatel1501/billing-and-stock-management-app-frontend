import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { Router } from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faPencil } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common'; 
import { SearchBarComponent } from '../../../shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-dashboard',
  standalone: true,           
  imports: [
    CommonModule,             
    SearchBarComponent,          
    FontAwesomeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit{
  faTrashCan = faTrashCan;
  faPencil = faPencil;
  stock: any[] = [];
  currentPage: number = 0;
  totalPages: number = 0;
  pageSize: number = 20;
  isLoading: boolean = false;
  isLastPage: boolean = false;
  userId!: any;
  expandedIndex: number | null = null;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.loadInitialData();
    // this.getStock(this.userId);
  }
  loadInitialData() {
    this.currentPage = 0;
    this.stock = [];
    this.getStock(0,false);
  }
  toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

  // getStock(userId:any) {
  //   this.authService.getStock(userId).subscribe((data) => {
  //     this.stock = data.content;
  //     console.log(data);
  //   });
  // }

  getStock(page: number = 0, append: boolean = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    // Pass userId, page number, and pageSize
    this.authService.getStock(this.userId, page, this.pageSize).subscribe({
      next: (data) => {
        this.totalPages = data.totalPages;
        this.isLastPage = data.last;
        this.currentPage = data.number; // Sync with API state

        if (append) {
          // Mobile behavior: add to existing list
          this.stock = [...this.stock, ...data.content];
        } else {
          // Desktop behavior: replace list
          this.stock = data.content;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }
  // Desktop Pagination Methods
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.getStock(page, false); // Replace data for desktop
      window.scrollTo(0, 0); // Scroll to top of table
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

  // Mobile Infinite Scroll Logic
  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
      const max = document.documentElement.scrollHeight - 100;
      
      if (pos > max) {
        // Request the NEXT page and APPEND it
        this.getStock(this.currentPage + 1, true);
      }
    }
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
