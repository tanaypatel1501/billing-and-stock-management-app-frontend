import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-add-stock',
  templateUrl: './add-stock.component.html',
  styleUrls: ['./add-stock.component.css']
})
export class AddStockComponent implements OnInit {
  productForm!: FormGroup;
  errorMessage: string | null = null;

  products: any[] = [];
  selectedProductId: number | null = null;

  showDropdown: boolean = false;

  // For keyboard navigation
  highlightedIndex: number = -1;

  page: number = 0;
  size: number = 10;

  private searchTimeout: any;
  private SEARCH_DEBOUNCE_MS = 200;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      batchNo: ['', Validators.required],
      expiryDate: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
    });
  }

  // TRIGGER SEARCH
  onProductSearch() {
    this.selectedProductId = null;
    this.highlightedIndex = -1;

    const text = this.productForm.get('name')?.value || "";

    if (!text.trim()) {
      this.products = [];
      this.showDropdown = false;
      return;
    }

    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.callProductSearchApi(text.trim());
    }, this.SEARCH_DEBOUNCE_MS);
  }

  // API CALL
  private callProductSearchApi(text: string) {
    const body = {
      searchText: text,
      page: this.page,
      size: this.size
    };

    this.authService.searchProducts(body).subscribe(
      (res: any) => {
        this.products = res.content || [];
        this.showDropdown = true;
      },
      () => {
        this.products = [];
        this.showDropdown = false;
      }
    );
  }

  // SELECT PRODUCT
  selectProduct(p: any) {
    this.productForm.patchValue({ name: p.name });
    this.selectedProductId = p.id;

    this.showDropdown = false;
    this.highlightedIndex = -1;
  }

  // OPEN DROPDOWN
  openDropdown() {
    if (this.products.length > 0) {
      this.showDropdown = true;
    }
  }

  // BLUR HANDLING
  onInputBlur() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 150);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {

    if (!this.showDropdown || this.products.length === 0) return;

    switch (event.key) {

      case "ArrowDown":
        event.preventDefault();
        this.highlightedIndex =
          (this.highlightedIndex + 1) % this.products.length;
        break;

      case "ArrowUp":
        event.preventDefault();
        this.highlightedIndex =
          (this.highlightedIndex - 1 + this.products.length) % this.products.length;
        break;

      case "Enter":
        if (this.highlightedIndex >= 0) {
          event.preventDefault();
          this.selectProduct(this.products[this.highlightedIndex]);
        }
        break;

      case "Escape":
        this.showDropdown = false;
        this.highlightedIndex = -1;
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (!target.closest('.product-search-container')) {
      this.showDropdown = false;
    }
  }

  // SUBMIT
  onSubmit() {
    if (!this.selectedProductId) {
      this.errorMessage = "Please select a product from dropdown.";
      this.clearMessageAfterDelay();
      return;
    }

    if (this.productForm.invalid) {
      this.errorMessage = "Please fill all required fields.";
      this.clearMessageAfterDelay();
      return;
    }

    const stockData = {
      userId: UserStorageService.getUserId(),
      productId: this.selectedProductId,
      batchNo: this.productForm.get('batchNo')?.value,
      expiryDate: this.productForm.get('expiryDate')?.value,
      quantity: this.productForm.get('quantity')?.value,
    };

    this.authService.addStock(stockData).subscribe(
      () => this.router.navigate(['user/dashboard']),
      () => {
        this.errorMessage = "Adding stock failed.";
        this.clearMessageAfterDelay();
      }
    );
  }

  private clearMessageAfterDelay() {
    setTimeout(() => this.errorMessage = null, 4000);
  }
}
