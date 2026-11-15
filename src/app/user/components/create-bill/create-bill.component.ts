import { Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';

const PATTERNS = {
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
  AADHAAR: /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/
};

@Component({
  selector: 'app-create-bill',
  templateUrl: './create-bill.component.html',
  styleUrls: ['./create-bill.component.scss']
})

export class CreateBillComponent implements OnInit, OnDestroy {

  faTrashCan = faTrashCan;

  showError = false;
  currentStep = 1;

  billForm1!: FormGroup;
  billForm2!: FormGroup;

  stock: any[] = [];
  filteredStock: any[] = [];
  products: any[] = [];

  step1Data: any = {};
  step2Data: any[] = [];

  displayProductName: string = '';
  showDropdown = false;
  highlightedIndex = -1;
  quantityPlaceholder = 'Quantity';
  selectedMrp: number | null = null;
  selectedPacking: string | null = null;

  expandedIndex: number | null = null;
  subscriptions: Subscription[] = [];
  documentType: 'GST' | 'PAN' | 'AADHAAR' = 'GST';

  purchaserSuggestions: any[] = [];
  showPurchaserDropdown = false;
  isPurchaserLoading = false;
  selectedPurchaserId: number | null = null;
  selectedExpiryRaw: string = '';
  showBatchDropdown = false;
  selectedBatchDisplay = '';

  private searchSubject = new Subject<string>();
  private lastStockSearch = '';
  private purchaserSearchTimeout: any;
  isLastStockPage = false;
  isBatchesLoading = false;
  private batchLoadToken = 0;
  private readonly STOCK_PAGE_SIZE = 20;
  private readonly BATCH_PAGE_SIZE = 100;
  private readonly MAX_BATCH_PAGES = 50;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private alertService: AlertService,
    private router: Router,
     private requestCache: RequestCacheService
  ) {}

  ngOnInit(): void {
    localStorage.removeItem('I_bill');
    this.billForm1 = this.fb.group({
      purchaserName: [null, Validators.required],
      dl1: [null, [Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      dl2: [null, [Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      gstin: [null, [Validators.pattern(PATTERNS.GST)]],
      invoiceDate: [null, Validators.required]
    });

    this.billForm2 = this.fb.group({
      productName: [null, Validators.required],
      productId: [null],
      stockId: [null, Validators.required],
      batchNo: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]], 
      free: [0, [Validators.required, Validators.min(0)]],
      expiryDate: [null, Validators.required],
      rate: [null, Validators.required],
      amount: [{ value: null, disabled: true }]
      }, {
        validators: [this.validateQuantity.bind(this)]
    });

    this.subscriptions.push(
      this.billForm2.valueChanges.subscribe(() => this.calculateAmount()),
    
      // switchMap cancels any in-flight request, so a slow response for an older
      // search can never overwrite the results of the latest one.
      // (distinctUntilChanged was removed: after clearing the input, re-typing the
      // same text was silently ignored and left the dropdown empty.)
      this.searchSubject.pipe(
        debounceTime(200),
        switchMap(searchText =>
          this.authService.searchStock({
            searchText,
            page: 0,
            size: this.STOCK_PAGE_SIZE
          }).pipe(
            map((res: any) => ({ res, ok: true })),
            catchError(() => of({ res: null, ok: false }))
          )
        )
      ).subscribe(({ res, ok }) => this.applyStockResult(res, ok, false))
    );
  }

  get totalQuantity(): number {
    return this.step2Data.reduce((sum, i) => sum + Number(i.quantity) + Number(i.free), 0);
  }

  get totalAmount(): number {
    return this.step2Data.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }

  get documentTypeLabel(): string {
    switch (this.documentType) {
      case 'PAN': return 'PAN';
      case 'AADHAAR': return 'Aadhaar';
      default: return 'GSTIN';
    }
  }

  /* ---------------- UI helpers ---------------- */

  toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

  openDropdown(): void {
    // only one dropdown may be open at a time
    this.showBatchDropdown = false;
    if (this.products.length > 0) {
      this.showDropdown = true;
    }
  }

  onInputBlur(): void {
    setTimeout(() => (this.showDropdown = false), 200);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  changeDocType(type: 'GST' | 'PAN' | 'AADHAAR'): void {
    this.documentType = type;
    const control = this.billForm1.get('gstin');
    
    if (control) {
      control.setValidators([Validators.pattern(PATTERNS[type])]);
      control.updateValueAndValidity(); // Refresh validation state
    }
  }

  toggleBatchDropdown(): void {
    if (this.filteredStock.length > 0 || this.isBatchesLoading) {
      this.showBatchDropdown = !this.showBatchDropdown;
      if (this.showBatchDropdown) this.showDropdown = false;
    }
  }

  onBatchBlur(): void {
    // delay so a click on a batch (mousedown) is registered before the list closes
    setTimeout(() => (this.showBatchDropdown = false), 200);
  }

  selectBatch(item: any): void {
    this.selectedBatchDisplay = item.batchNo;
    this.selectedExpiryRaw = item.expiryDate; 
    this.showBatchDropdown = false;
    this.billForm2.patchValue({ stockId: item.id });
    this.updateQuantityPlaceholder();
  }

  formatDateDisplay(date: string | Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${year}`;
  }

  /* ---------------- Product search (RESTORED) ---------------- */

  onProductSearch(): void {
    this.displayProductName = '';

    // Typing a new product name invalidates the previous product's batch:
    // close the batch list and clear the stale batch / stock selection.
    this.showBatchDropdown = false;
    this.batchLoadToken++;
    this.isBatchesLoading = false;
    this.filteredStock = [];
    this.selectedBatchDisplay = '';
    this.selectedExpiryRaw = '';
    this.selectedMrp = null;
    this.selectedPacking = null;
    this.quantityPlaceholder = 'Quantity';
    this.billForm2.patchValue({
      productId: null,
      stockId: null,
      batchNo: null,
      expiryDate: null
    }, { emitEvent: false });
    const searchText = this.billForm2.get('productName')?.value?.trim();

    if (!searchText || searchText.length < 2) {
      this.products = [];
      this.stock = [];
      this.showDropdown = false;
      return;
    }

    this.lastStockSearch = searchText;
    this.searchSubject.next(searchText);   
  }

  /** Loads the next page of product-search results (called when the dropdown is scrolled to the end). */
  searchStockPaged(searchText: string, isNextPage: boolean): void {
    const page = isNextPage ? Math.ceil(this.stock.length / this.STOCK_PAGE_SIZE) : 0;

    this.authService.searchStock({
      searchText: searchText,
      page: page,
      size: this.STOCK_PAGE_SIZE,
    }).subscribe({
      next: (res: any) => {
        // user kept typing while this page was loading -> result is stale
        if (searchText !== this.lastStockSearch) return;
        this.applyStockResult(res, true, isNextPage);
      },
      error: () => this.applyStockResult(null, false, isNextPage)
    });
  }

  onProductDropdownScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (nearBottom && !this.isLastStockPage && this.lastStockSearch) {
      this.searchStockPaged(this.lastStockSearch, true);
    }
  }

  private applyStockResult(res: any, ok: boolean, isNextPage: boolean): void {
    if (!ok) {
      if (!isNextPage) {
        this.products = [];
        this.stock = [];
        this.showDropdown = false;
      }
      return;
    }

    const list = res?.content ?? res ?? [];

    // Accumulate all stock batches across pages
    this.stock = isNextPage ? [...this.stock, ...list] : list;
    this.isLastStockPage = res?.last ?? true;

    // Dropdown shows only unique product names
    const seen = new Set<string>();
    this.products = this.stock
      .filter((i: any) => {
        const key = `${i.product.name}|${i.product.packing ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((i: any) => ({
        name: i.product.name,
        packing: i.product.packing
      }));

    this.showDropdown = this.products.length > 0;
  }

  /**
   * The product search is paged by *batch rows* (20 per page), so the rows we
   * already hold may contain only some of a product's batches. After a product is
   * selected we therefore fetch every batch of that product explicitly.
   */
  private loadAllBatches(p: any): void {
    const token = ++this.batchLoadToken;
    this.isBatchesLoading = true;

    const fetchPage = (page: number, acc: any[]): void => {
      this.authService.searchStock({
        searchText: p.name,
        page,
        size: this.BATCH_PAGE_SIZE
      }).subscribe({
        next: (res: any) => {
          if (token !== this.batchLoadToken) return;   // another product was picked meanwhile

          const list = res?.content ?? res ?? [];
          const all = [...acc, ...list];
          const isLast = res?.last ?? true;

          if (!isLast && list.length > 0 && page + 1 < this.MAX_BATCH_PAGES) {
            fetchPage(page + 1, all);
            return;
          }

          this.isBatchesLoading = false;
          this.filteredStock = this.buildBatchList(all, p);
        },
        error: () => {
          if (token !== this.batchLoadToken) return;
          this.isBatchesLoading = false;   // keep the batches we already have from the search results
        }
      });
    };

    fetchPage(0, []);
  }

  private buildBatchList(rows: any[], p: any): any[] {
    const seenIds = new Set<number>();
    return rows.filter(s => {
      if (s.product.name !== p.name) return false;
      if ((s.product.packing ?? '') !== (p.packing ?? '')) return false;
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      const used = this.step2Data
        .filter(i => i.stockId === s.id)
        .reduce((sum, i) => sum + Number(i.quantity) + Number(i.free), 0);
      return (Number(s.quantity) - used) > 0;
    });
  }

  selectProduct(p: any): void {
    this.displayProductName = p.packing ? `${p.name} | ${p.packing}` : p.name;
    this.billForm2.reset({
      productName: p.name,
      free: 0
    });
    this.selectedPacking = p.packing ?? null;

    // show what we already have immediately, then complete the list from the server
    this.filteredStock = this.buildBatchList(this.stock, p);
    this.loadAllBatches(p);

    this.selectedMrp = null;
    this.selectedExpiryRaw = ''; 
    this.quantityPlaceholder = 'Quantity';
    this.showDropdown = false;
    this.selectedBatchDisplay = '';    
    this.showBatchDropdown = false; 
  }

  /* ---------------- Calculations ---------------- */

  calculateAmount(): void {
    const { productName, stockId, rate, quantity } = this.billForm2.getRawValue();
    if (!productName || !stockId || !rate || !quantity) {
      this.billForm2.get('amount')?.setValue(null);
      return;
    }

    const stockItem = this.filteredStock.find(s => s.id === Number(stockId));
    if (!stockItem) return;

    const base = Number(rate) * Number(quantity);
    const tax = (base * (Number(stockItem.product.cgst) + Number(stockItem.product.sgst))) / 100;
    this.billForm2.get('amount')?.setValue(Math.round((base + tax) * 100) / 100);
  }

  updateQuantityPlaceholder(): void {
    const stockId = this.billForm2.get('stockId')?.value;
    const item = this.filteredStock.find(s => s.id === Number(stockId));
    if (!item) return;

    const used = this.step2Data
      .filter(i => i.stockId === item.id)
      .reduce((sum, i) => sum + i.quantity + i.free, 0);

    const remaining = item.quantity - used;
    this.quantityPlaceholder = `Available quantity: ${remaining}`;
    this.selectedMrp = item.mrp ?? item.product.mrp;

    this.billForm2.patchValue({
      productId: item.product.id,
      batchNo: item.batchNo,           
      expiryDate: this.formatDateDisplay(item.expiryDate)
    });
  }

  /* ---------------- Validators ---------------- */

  validateQuantity(group: AbstractControl): { [key: string]: boolean } | null {
    const quantity = Number(group.get('quantity')?.value || 0);
    const free = Number(group.get('free')?.value || 0);
    const stockId = group.get('stockId')?.value;


    const item = this.filteredStock.find(s => s.id === Number(stockId));
    if (!item) return null;

    const used = this.step2Data
      .filter(i => i.stockId === item.id)
      .reduce((sum, i) => sum + i.quantity + i.free, 0);

    return (quantity + free) > (item.quantity - used) ? { invalidQuantity: true } : null;
  }

  /* ---------------- Navigation ---------------- */

  nextStep(): void {
    if (this.billForm1.valid) {
      const raw = this.billForm1.value;
      this.step1Data = {
        ...raw,
        dl1: raw.dl1?.trim() || 'N/A',
        dl2: raw.dl2?.trim() || 'N/A',
        gstin: raw.gstin?.trim() || 'N/A',
        purchaserId: this.selectedPurchaserId ?? undefined
      };

      this.authService.savePurchaser({
        id: this.selectedPurchaserId ?? undefined,
        name: this.step1Data.purchaserName,
        dl1: this.step1Data.dl1,
        dl2: this.step1Data.dl2,
        gstin: this.step1Data.gstin
      }).subscribe({
        next: (saved) => {
          this.selectedPurchaserId = saved.id;
          this.step1Data.purchaserId = saved.id;   
          this.requestCache.invalidate('purchasers:'); 
        },
        error: () => {} 
      });

      this.currentStep = 2;
    } else {
      this.billForm1.markAllAsTouched();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  /* ---------------- Bill items ---------------- */

  addItem(): void {
    if (this.billForm2.valid) {
      const raw = this.billForm2.getRawValue();
      const stockItem = this.filteredStock.find(s => s.id === Number(raw.stockId));
      this.step2Data.push({ ...raw, expiryDate: this.selectedExpiryRaw, stockItem });
      this.billForm2.reset({ free: 0 });
      this.billForm2.markAsPristine(); 
      this.billForm2.markAsUntouched();
      this.displayProductName = '';
      this.batchLoadToken++;
      this.isBatchesLoading = false;
      this.filteredStock = [];
      this.selectedMrp = null;
      this.selectedExpiryRaw = '';
      this.quantityPlaceholder = 'Quantity';
      this.selectedBatchDisplay = '';    
      this.showBatchDropdown = false; 
    } else {
      this.billForm2.markAllAsTouched();
    }
  }

  goToReviewStep(): void {
    if (this.step2Data.length === 0) {
      this.alertService.error('Bill cannot be empty. Add items to the bill inorder to proceed.', 'Empty Bill', 3000);
      return;
    }

    if (this.billForm2.dirty) {
      this.alertService.confirm(
        'You have an unsaved item in the form. Proceed to review without it?',
        () => (this.currentStep = 3),
        'Unsaved Item',
        () => {}
      );
      return;
    }

    this.currentStep = 3;
  }

  delete(index: number): void {
    this.step2Data.splice(index, 1);
    if (this.expandedIndex === index) this.expandedIndex = null;
  }

  /* ---------------- Purchaser Details ---------------- */
  onPurchaserSearch(): void {
    const text = this.billForm1.get('purchaserName')?.value?.trim();
    this.selectedPurchaserId = null; // clear selection on new typing

    if (!text || text.length < 2) {
      this.purchaserSuggestions = [];
      this.showPurchaserDropdown = false;
      return;
    }

    clearTimeout(this.purchaserSearchTimeout);
    this.purchaserSearchTimeout = setTimeout(() => {
      this.isPurchaserLoading = true;
      this.authService.searchPurchasers(text).subscribe({
        next: (data) => {
          this.purchaserSuggestions = data;
          this.showPurchaserDropdown = data.length > 0;
          this.isPurchaserLoading = false;
        },
        error: () => {
          this.purchaserSuggestions = [];
          this.isPurchaserLoading = false;
        }
      });
    }, 200);
  }

  selectPurchaser(p: any): void {
    this.selectedPurchaserId = p.id;

    // ✅ detect doc type from gstin value
    if (p.gstin && p.gstin !== 'N/A') {
      if (/^[0-9]{12}$/.test(p.gstin)) {
        this.documentType = 'AADHAAR';
      } else if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(p.gstin)) {
        this.documentType = 'PAN';
      } else {
        this.documentType = 'GST';
      }
      const control = this.billForm1.get('gstin');
      control?.setValidators([Validators.pattern(PATTERNS[this.documentType])]);
      control?.updateValueAndValidity();
    }

    this.billForm1.patchValue({
      purchaserName: p.name,
      dl1: p.dl1 === 'N/A' ? null : p.dl1,
      dl2: p.dl2 === 'N/A' ? null : p.dl2,
      gstin: p.gstin === 'N/A' ? null : p.gstin,
    });

    this.showPurchaserDropdown = false;
    this.purchaserSuggestions = [];
  }

  onPurchaserBlur(): void {
    setTimeout(() => (this.showPurchaserDropdown = false), 200);
  }

  /* ---------------- Submit ---------------- */

  submitBill(): void {
    if (this.step2Data.length === 0) {
      this.alertService.error('Bill cannot be empty. Add items to the bill inorder to submit.', 'Empty Bill', 3000);
      this.currentStep = 2;
      return;
    }

    this.processBillSubmit();
  }

  private processBillSubmit(): void {
    const invalidItems = this.step2Data.some(item => {
      const stockItem = item.stockItem;
      if (!stockItem) return true;
      return (item.quantity + item.free) > stockItem.quantity;
    });

    if (invalidItems) {
      console.error('Invalid items in bill');
      return;
    }

    const payload = {
      purchaserId: this.step1Data.purchaserId,
      purchaserName: this.step1Data.purchaserName,
      dl1: this.step1Data.dl1,
      dl2: this.step1Data.dl2,
      gstin: this.step1Data.gstin,
      invoiceDate: this.step1Data.invoiceDate,
      billItems: this.step2Data.map(item => ({
        stockId: item.stockId,
        quantity: item.quantity,
        free: item.free,
        rate: item.rate,
        amount: item.amount
      }))
    };

    this.authService.createBill(payload).subscribe({
      next: (bill: any) => {
        this.userStorageService.saveBillId(bill.id);
        this.requestCache.invalidateMany(['stock:', 'inventory-value:', 'sales:', 'stockLogs:', 'bills:']);   
        this.router.navigate(['user/bill-preview']);
      },
      error: (err) => {
        console.error('Error submitting bill:', err);
        const message = err?.error?.message || 'Failed to submit bill. Please try again.';
        this.alertService.error(message, 'Submission Failed', 4000);
      }
    });
  }
}