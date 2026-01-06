import { Component, HostListener, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-stock-form',
  templateUrl: './stock-form.component.html',
  styleUrls: ['./stock-form.component.css']
})
export class StockFormComponent implements OnInit {

  @Input() mode: 'add' | 'edit' = 'add';

  productForm!: FormGroup;
  errorMessage: string | null = null;

  products: any[] = [];
  selectedProductId: number | null = null;
  stockId!: number;

  showDropdown = false;
  highlightedIndex = -1;

  page = 0;
  size = 10;
  isLoadingSearch = false;
  isMoreLoading = false;
  isLastPage = false;
  selectedMrp: number | null = null;


  private searchTimeout: any;
  private SEARCH_DEBOUNCE_MS = 200;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.mode === 'edit') {
      this.productForm.get('name')?.disable();
      this.stockId = Number(this.route.snapshot.paramMap.get('stockId'));
      this.loadStock();
    }
  }

  private initForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      batchNo: ['', Validators.required],
      expiryDate: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(0)]],
    });
  }

  private formatDate(date: string): string {
    return date ? date.split('T')[0] : '';
  }

  private fetchProductName(productId: number) {
    this.authService.getProductById(productId).subscribe(
      (product: any) => {
        this.productForm.patchValue({
          name: product.name
        });
        this.selectedMrp = product.mrp ?? null;
      },
      () => {
        this.errorMessage = 'Failed to load product details';
      }
    );
  }

  // ================= LOAD STOCK (EDIT) =================

  private loadStock() {
    this.authService.getStockById(this.stockId).subscribe(
      (res: any) => {
        this.selectedProductId = res.productId;

        this.productForm.patchValue({
          batchNo: res.batchNo,
          expiryDate: this.formatDate(res.expiryDate),
          quantity: res.quantity
        });
        this.fetchProductName(res.productId);
        this.productForm.get('name')?.disable();
      },
      () => this.errorMessage = 'Failed to load stock'
    );
  }

  // ================= PRODUCT SEARCH =================

  onProductSearch() {
    if (this.mode === 'edit') return;
    this.selectedProductId = null;
    this.highlightedIndex = -1;

    const text = this.productForm.get('name')?.value || '';
    if (!text.trim()) {
      this.products = [];
      this.showDropdown = false;
      return;
    }

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchProducts(text.trim());
    }, this.SEARCH_DEBOUNCE_MS);
  }

  private searchProducts(text: string, isNextPage = false) {
    if (isNextPage) {
      this.isMoreLoading = true;
    } else {
      this.page = 0;
      this.isLastPage = false;
      this.isLoadingSearch = true;
    }

    const body = { searchText: text, page: this.page, size: this.size };

    this.authService.searchProducts(body).subscribe(
      (res: any) => {
        const newProducts = res.content || [];
        this.products = isNextPage ? [...this.products, ...newProducts] : newProducts;
        this.isLastPage = res.last;
        this.showDropdown = true;
        this.isLoadingSearch = false;
        this.isMoreLoading = false;
      },
      () => {
        this.products = [];
        this.showDropdown = false;
        this.isLoadingSearch = false;
        this.isMoreLoading = false;
      }
    );
  }

  selectProduct(p: any) {
    this.productForm.patchValue({ name: p.name });
    this.selectedProductId = p.id;
    this.selectedMrp = p.mrp ?? null; 
    this.showDropdown = false;
  }

  openDropdown() {
    if (this.products.length) this.showDropdown = true;
  }

  onInputBlur() {
    setTimeout(() => this.showDropdown = false, 150);
  }

  // ================= SUBMIT =================

  onSubmit() {
    if (!this.selectedProductId) {
      this.errorMessage = 'Please select a product';
      return;
    }

    const payload: any = {
      userId: UserStorageService.getUserId(),
      productId: this.selectedProductId,
      batchNo: this.productForm.value.batchNo,
      expiryDate: this.productForm.value.expiryDate,
      quantity: this.productForm.value.quantity
    };

    if (this.mode === 'edit') {
      payload.id = this.stockId;
      this.authService.updateStock(payload).subscribe(
        () => this.router.navigate(['user/dashboard']),
        () => this.errorMessage = 'Update failed'
      );
    } else {
      this.authService.addStock(payload).subscribe(
        () => this.router.navigate(['user/dashboard']),
        () => this.errorMessage = 'Add failed'
      );
    }
  }

  // ================= KEYBOARD SUPPORT =================

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.showDropdown || !this.products.length) return;

    if (event.key === 'ArrowDown') {
      this.highlightedIndex = (this.highlightedIndex + 1) % this.products.length;
      event.preventDefault();
    }
    if (event.key === 'ArrowUp') {
      this.highlightedIndex =
        (this.highlightedIndex - 1 + this.products.length) % this.products.length;
      event.preventDefault();
    }
    if (event.key === 'Enter' && this.highlightedIndex >= 0) {
      this.selectProduct(this.products[this.highlightedIndex]);
      event.preventDefault();
    }
  }
}
