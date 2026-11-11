import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { DebouncedSearch } from 'src/app/shared/utils/debounced-search';
import {
  Purchase, Supplier, TaxMode, PurchaseTotals, calcTotals, lineAmount
} from 'src/app/models/purchase.model';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface DraftItem {
  productId: number;
  productName: string;
  packing: string | null;
  cgst: number;
  sgst: number;
  batchNo: string;
  expiryDate: string;          // yyyy-MM-dd (last day of the month)
  mrp: number | null;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  discountPercent: number;
  amount: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-create-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './create-purchase.component.html',
  styleUrls: ['../create-bill/create-bill.component.scss', './create-purchase.component.scss']
})
export class CreatePurchaseComponent implements OnInit, OnDestroy {

  faTrashCan = faTrashCan;
  currentStep = 1;
  today = todayLocal();

  // shop info, used for the tax-type default
  private shopState: string | null = null;
  private shopTaxMode: TaxMode = 'CGST_SGST';

  // ---- step 1: supplier and invoice ----
  form1!: FormGroup;
  states: string[] = [];
  supplier: Supplier | null = null;
  supplierSuggestions: Supplier[] = [];
  showSupplierDropdown = false;
  isSupplierLoading = false;
  savingSupplier = false;

  taxMode: TaxMode = 'CGST_SGST';
  taxHint = '';
  private taxModeTouched = false;

  // ---- step 2: items ----
  form2!: FormGroup;
  products: any[] = [];
  showProductDropdown = false;
  isProductLoading = false;
  selectedProduct: any = null;
  items: DraftItem[] = [];
  expandedIndex: number | null = null;

  readonly months = MONTHS;
  readonly years: number[] = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + i);

  previewAmount = 0;
  previewUnitCost = 0;

  // ---- submit ----
  submitting = false;

  private supplierSearch = new DebouncedSearch(t => this.searchSuppliers(t), 250);
  private productSearch = new DebouncedSearch(t => this.searchProducts(t), 250);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form1 = this.fb.group({
      supplierName: [null, Validators.required],
      state: [null],
      gstin: [null, [Validators.pattern(GSTIN_PATTERN)]],
      invoiceNo: [null, [Validators.required, Validators.maxLength(100)]],
      invoiceDate: [todayLocal(), Validators.required]
    });

    this.form2 = this.fb.group({
      productName: [null, Validators.required],
      productId: [null, Validators.required],
      batchNo: [null, [Validators.required, Validators.maxLength(100)]],
      expiryMonth: [null, Validators.required],
      expiryYear: [null, Validators.required],
      mrp: [null, [Validators.min(0)]],
      quantity: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      freeQuantity: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      purchaseRate: [null, [Validators.required, Validators.min(0)]],
      discountPercent: [0, [Validators.min(0), Validators.max(100)]]
    });

    this.form1.get('state')?.valueChanges.subscribe(() => this.applyTaxDefault());
    this.form2.valueChanges.subscribe(() => this.updatePreview());

    this.authService.getAllStates().subscribe({
      next: s => (this.states = s),
      error: () => (this.states = [])
    });

    // Shop state and default tax type, used to suggest IGST or CGST + SGST
    this.authService.getDetailsByUserId(null).subscribe({
      next: (d: any) => {
        this.shopState = d?.state ?? null;
        this.shopTaxMode = d?.taxMode === 'IGST' ? 'IGST' : 'CGST_SGST';
        this.applyTaxDefault();
      },
      error: () => this.applyTaxDefault()
    });
  }

  ngOnDestroy(): void {
    this.supplierSearch.destroy();
    this.productSearch.destroy();
  }

  /* =====================  Tax type  ===================== */

  setTaxMode(mode: TaxMode): void {
    this.taxMode = mode;
    this.taxModeTouched = true;
    this.taxHint = 'Set manually for this purchase.';
  }

  private applyTaxDefault(): void {
    if (this.taxModeTouched) return;

    const supplierState: string | null = this.supplier?.state ?? this.form1?.get('state')?.value ?? null;

    if (supplierState && this.shopState) {
      const same = supplierState.trim().toLowerCase() === this.shopState.trim().toLowerCase();
      this.taxMode = same ? 'CGST_SGST' : 'IGST';
      this.taxHint = same
        ? `Supplier and your shop are both in ${this.shopState}: intra-state, so CGST + SGST.`
        : `Supplier is in ${supplierState}, your shop is in ${this.shopState}: inter-state, so IGST.`;
    } else {
      this.taxMode = this.shopTaxMode;
      this.taxHint = 'Using your shop default. Add the supplier’s state to pick this automatically.';
    }
  }

  /* =====================  Step 1  ===================== */

  onSupplierInput(): void {
    this.supplier = null;                 // typing again means "not the selected one"
    this.applyTaxDefault();
    const text = (this.form1.get('supplierName')?.value ?? '').trim();
    if (text.length < 2) {
      this.supplierSuggestions = [];
      this.showSupplierDropdown = false;
      return;
    }
    this.supplierSearch.next(text);
  }

  private searchSuppliers(text: string): void {
    this.isSupplierLoading = true;
    this.authService.searchSuppliers(text).subscribe({
      next: list => {
        this.supplierSuggestions = list;
        this.showSupplierDropdown = true;
        this.isSupplierLoading = false;
      },
      error: () => {
        this.supplierSuggestions = [];
        this.isSupplierLoading = false;
      }
    });
  }

  selectSupplier(s: Supplier): void {
    this.supplier = s;
    this.form1.patchValue({ supplierName: s.name }, { emitEvent: false });
    this.showSupplierDropdown = false;
    this.applyTaxDefault();
  }

  onSupplierBlur(): void {
    setTimeout(() => (this.showSupplierDropdown = false), 200);
  }

  nextStep(): void {
    const name = (this.form1.get('supplierName')?.value ?? '').trim();
    if (!name) {
      this.form1.get('supplierName')?.setValue('');
      this.form1.markAllAsTouched();
      return;
    }
    if (this.form1.invalid) {
      this.form1.markAllAsTouched();
      return;
    }
    if (this.form1.value.invoiceDate > todayLocal()) {
      this.alertService.error('Invoice date cannot be in the future.');
      return;
    }

    if (this.supplier) {
      this.currentStep = 2;
      return;
    }

    // Typed name, not picked from the list: reuse an exact match, otherwise create it
    this.savingSupplier = true;
    this.authService.searchSuppliers(name).subscribe({
      next: list => {
        const exact = list.find(s => (s.name || '').trim().toLowerCase() === name.toLowerCase());
        if (exact) {
          this.savingSupplier = false;
          this.selectSupplier(exact);
          this.currentStep = 2;
        } else {
          this.createSupplier(name);
        }
      },
      error: () => {
        this.savingSupplier = false;
        this.alertService.error('Could not check existing suppliers. Please try again.');
      }
    });
  }

  private createSupplier(name: string): void {
    const raw = this.form1.value;
    const gstin = raw.gstin && raw.gstin.trim() ? raw.gstin.trim().toUpperCase() : null;

    this.authService.saveSupplier({ name, state: raw.state || null, gstin }).subscribe({
      next: saved => {
        this.savingSupplier = false;
        this.supplier = saved;
        this.requestCache.invalidate('suppliers:');
        this.applyTaxDefault();
        this.currentStep = 2;
      },
      error: (err) => {
        this.savingSupplier = false;
        this.alertService.error(err?.error?.message || 'Failed to save supplier.');
      }
    });
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  /* =====================  Step 2  ===================== */

  onProductInput(): void {
    this.selectedProduct = null;
    this.form2.patchValue({ productId: null }, { emitEvent: false });
    const text = (this.form2.get('productName')?.value ?? '').trim();
    if (text.length < 2) {
      this.products = [];
      this.showProductDropdown = false;
      return;
    }
    this.productSearch.next(text);
  }

  private searchProducts(text: string): void {
    this.isProductLoading = true;
    this.authService.searchProducts({ searchText: text, page: 0, size: 20 }).subscribe({
      next: res => {
        this.products = res.content ?? [];
        this.showProductDropdown = true;
        this.isProductLoading = false;
      },
      error: () => {
        this.products = [];
        this.showProductDropdown = false;
        this.isProductLoading = false;
      }
    });
  }

  selectProduct(p: any): void {
    this.selectedProduct = p;
    this.form2.patchValue({
      productName: p.packing ? `${p.name} | ${p.packing}` : p.name,
      productId: p.id,
      mrp: p.mrp ?? null
    });
    this.showProductDropdown = false;
  }

  onProductBlur(): void {
    setTimeout(() => (this.showProductDropdown = false), 200);
  }

  private updatePreview(): void {
    const v = this.form2.value;
    const qty = Number(v.quantity) || 0;
    const free = Number(v.freeQuantity) || 0;
    this.previewAmount = lineAmount(qty, Number(v.purchaseRate) || 0, Number(v.discountPercent) || 0);
    this.previewUnitCost = (qty + free) > 0 ? this.previewAmount / (qty + free) : 0;
  }

  addItem(): void {
    if (this.form2.invalid || !this.selectedProduct) {
      this.form2.markAllAsTouched();
      return;
    }

    const v = this.form2.value;
    const month = Number(v.expiryMonth);
    const year = Number(v.expiryYear);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      this.alertService.error('Expiry date is in the past.');
      return;
    }
    const lastDay = new Date(year, month, 0).getDate();   // same convention as Add Stock

    const quantity = Number(v.quantity);
    const freeQuantity = Number(v.freeQuantity) || 0;
    const purchaseRate = Number(v.purchaseRate);
    const discountPercent = Number(v.discountPercent) || 0;

    this.items.push({
      productId: this.selectedProduct.id,
      productName: this.selectedProduct.name,
      packing: this.selectedProduct.packing ?? null,
      cgst: Number(this.selectedProduct.cgst) || 0,
      sgst: Number(this.selectedProduct.sgst) || 0,
      batchNo: String(v.batchNo).trim(),
      expiryDate: `${year}-${pad(month)}-${pad(lastDay)}`,
      mrp: v.mrp === null || v.mrp === '' ? null : Number(v.mrp),
      quantity,
      freeQuantity,
      purchaseRate,
      discountPercent,
      amount: lineAmount(quantity, purchaseRate, discountPercent)
    });

    this.resetItemForm();
  }

  private resetItemForm(): void {
    this.form2.reset({ freeQuantity: 0, discountPercent: 0 });
    this.selectedProduct = null;
    this.products = [];
    this.showProductDropdown = false;
    this.previewAmount = 0;
    this.previewUnitCost = 0;
  }

  deleteItem(index: number): void {
    this.items.splice(index, 1);
    if (this.expandedIndex === index) this.expandedIndex = null;
  }

  toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

  goToReview(): void {
    if (this.items.length === 0) {
      this.alertService.error('Add at least one item to proceed.', 'No Items', 3000);
      return;
    }
    if (this.form2.dirty) {
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

  /* =====================  Totals  ===================== */

  get totals(): PurchaseTotals {
    return calcTotals(
      this.items.map(i => ({ amount: i.amount, cgst: i.cgst, sgst: i.sgst })),
      this.taxMode
    );
  }

  get totalUnits(): number {
    return this.items.reduce((sum, i) => sum + i.quantity + i.freeQuantity, 0);
  }

  get itemsSubtotal(): number {
    return this.items.reduce((sum, i) => sum + i.amount, 0);
  }

  /* =====================  Submit  ===================== */

  submit(): void {
    if (this.submitting) return;

    if (!this.supplier?.id) {
      this.currentStep = 1;
      this.alertService.error('Please choose a supplier.');
      return;
    }
    if (this.items.length === 0) {
      this.currentStep = 2;
      this.alertService.error('Add at least one item to submit.', 'No Items', 3000);
      return;
    }

    const payload: Purchase = {
      supplierId: this.supplier.id,
      supplierInvoiceNo: String(this.form1.value.invoiceNo).trim(),
      invoiceDate: this.form1.value.invoiceDate,
      taxMode: this.taxMode,
      purchaseItems: this.items.map(i => ({
        productId: i.productId,
        batchNo: i.batchNo,
        expiryDate: i.expiryDate,
        mrp: i.mrp,
        quantity: i.quantity,
        freeQuantity: i.freeQuantity,
        purchaseRate: i.purchaseRate,
        discountPercent: i.discountPercent
      }))
    };

    this.submitting = true;
    this.authService.createPurchase(payload).subscribe({
      next: () => {
        this.requestCache.invalidateMany(['purchases:', 'suppliers:', 'stock:', 'inventory-value:', 'stockLogs:']);
        this.alertService.success('Purchase saved and stock updated.');
        this.router.navigate(['/user/purchases']);
      },
      error: (err) => {
        this.submitting = false;
        this.alertService.error(
          err?.error?.message || 'Failed to save purchase. Please try again.',
          'Submission Failed',
          6000
        );
      }
    });
  }
}