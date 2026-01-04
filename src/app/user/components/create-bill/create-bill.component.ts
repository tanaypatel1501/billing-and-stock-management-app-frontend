import { Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { Subscription } from 'rxjs';

const PATTERNS = {
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
  AADHAAR: /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/
};

@Component({
  selector: 'app-create-bill',
  templateUrl: './create-bill.component.html',
  styleUrls: ['./create-bill.component.css']
})

export class CreateBillComponent implements OnInit, OnDestroy {

  faTrashCan = faTrashCan;

  showError = false;
  currentStep = 1;

  billForm1!: FormGroup;
  billForm2!: FormGroup;

  userId!: number;

  stock: any[] = [];
  filteredStock: any[] = [];
  products: any[] = [];

  step1Data: any = {};
  step2Data: any[] = [];

  showDropdown = false;
  highlightedIndex = -1;
  quantityPlaceholder = 'Quantity';
  selectedMrp: number | null = null;

  expandedIndex: number | null = null;
  subscriptions: Subscription[] = [];
  documentType: 'GST' | 'PAN' | 'AADHAAR' = 'GST';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    localStorage.removeItem('I_bill');
    this.billForm1 = this.fb.group({
      purchaserName: [null, Validators.required],
      dl1: [null, [Validators.required, Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      dl2: [null, [Validators.required, Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      gstin: [null, [Validators.required, Validators.pattern(PATTERNS.GST)]],
      invoiceDate: [null, Validators.required]
    });

    this.billForm2 = this.fb.group({
      productName: [null, Validators.required],
      productId: [null],
      batchNo: [null, Validators.required],
      quantity: [null, [Validators.required, this.validateQuantity.bind(this)]],
      free: [0, Validators.required],
      expiryDate: [null, Validators.required],
      rate: [null, Validators.required],
      amount: [{ value: null, disabled: true }]
    });

    this.subscriptions.push(
      this.billForm2.valueChanges.subscribe(() => this.calculateAmount())
    );
  }

  /* ---------------- UI helpers ---------------- */

  toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

  openDropdown(): void {
    this.showDropdown = true;
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
      control.setValidators([Validators.required, Validators.pattern(PATTERNS[type])]);
      control.updateValueAndValidity(); // Refresh validation state
    }
  }

  /* ---------------- Product search (RESTORED) ---------------- */

  onProductSearch(): void {
    const searchText = this.billForm2.get('productName')?.value;

    if (!searchText || searchText.length < 2) {
      this.products = [];
      this.showDropdown = false;
      return;
    }

    this.authService.searchStock({
      search: searchText,
      page: 0,
      size: 10
    }).subscribe({
      next: (res: any) => {
        const list = res?.content ?? res ?? [];
        this.stock = list;

        const seen = new Set<string>();
        this.products = list
          .filter((i: any) => {
            if (seen.has(i.product.name)) return false;
            seen.add(i.product.name);
            return true;
          })
          .map((i: any) => ({
            name: i.product.name,
            packing: i.product.packing
          }));

        this.showDropdown = true;
      },
      error: () => {
        this.products = [];
        this.stock = [];
        this.showDropdown = false;
      }
    });
  }

  selectProduct(p: any): void {
    this.billForm2.reset({
      productName: p.name,
      free: 0
    });

    this.filteredStock = this.stock.filter(
      s => s.product.name === p.name
    );

    this.selectedMrp = null;
    this.quantityPlaceholder = 'Quantity';
    this.showDropdown = false;
  }

  /* ---------------- Calculations ---------------- */

  calculateAmount(): void {
    const { productName, batchNo, rate, quantity } =
      this.billForm2.getRawValue();

    if (!productName || !batchNo || !rate || !quantity) {
      this.billForm2.get('amount')?.setValue(null);
      return;
    }

    const stockItem = this.stock.find(
      s => s.product.name === productName && s.batchNo === batchNo
    );

    if (!stockItem) return;

    const base = Number(rate) * Number(quantity);
    const tax =
      (base * (Number(stockItem.product.cgst) + Number(stockItem.product.sgst))) / 100;

    this.billForm2.get('amount')?.setValue(base + tax);
  }

  updateQuantityPlaceholder(): void {
    const productName = this.billForm2.get('productName')?.value;
    const batchNo = this.billForm2.get('batchNo')?.value;

    const item = this.stock.find(
      s => s.product.name === productName && s.batchNo === batchNo
    );

    if (!item) return;

    this.quantityPlaceholder = `Available quantity: ${item.quantity}`;
    this.selectedMrp = item.product.mrp;

    this.billForm2.patchValue({
      productId: item.product.id,
      expiryDate: this.formatDate(item.expiryDate)
    });
  }

  /* ---------------- Validators ---------------- */

  validateQuantity(): { [key: string]: boolean } | null {
    const quantity = Number(this.billForm2?.get('quantity')?.value || 0);
    const free = Number(this.billForm2?.get('free')?.value || 0);
    const productName = this.billForm2?.get('productName')?.value;
    const batchNo = this.billForm2?.get('batchNo')?.value;

    const item = this.stock.find(
      s => s.product.name === productName && s.batchNo === batchNo
    );

    if (item && quantity + free > item.quantity) {
      return { invalidQuantity: true };
    }

    return null;
  }

  /* ---------------- Navigation ---------------- */

  nextStep(): void {
    if (this.billForm1.valid) {
      this.step1Data = { ...this.billForm1.value, userId: this.userId };
      this.currentStep = 2;
    } else {
      this.billForm1.markAllAsTouched();
    }
  }

  prevStep(): void {
    this.currentStep = 1;
  }

  /* ---------------- Bill items ---------------- */

  addItem(): void {
    if (this.billForm2.valid) {
      this.step2Data.push(this.billForm2.getRawValue());
      this.billForm2.reset({ free: 0 });
    } else {
      this.billForm2.markAllAsTouched();
    }
  }

  delete(index: number): void {
    this.step2Data.splice(index, 1);
    if (this.expandedIndex === index) this.expandedIndex = null;
  }

  /* ---------------- Submit ---------------- */

  submitBill(): void {
    if (this.step2Data.length === 0) {
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
      return;
    }

    this.authService.createBill(this.step1Data).subscribe({
      next: (bill: any) => {
        this.userStorageService.saveBillId(bill.id);
        let completed = 0;
        this.step2Data.forEach(item => {
          const stockItem = this.stock.find(
            s => s.product.name === item.productName && s.batchNo === item.batchNo
          );

          if (!stockItem) return;

          this.authService.addBillItem({
            ...item,
            billId: bill.id,
            productId: stockItem.product.id
          }).subscribe({
            next: () => {
              this.authService.updateStock({
                userId: this.userId,
                productId: stockItem.product.id,
                batchNo: stockItem.batchNo,
                expiryDate: this.formatDate(stockItem.expiryDate),
                quantity: stockItem.quantity - (item.quantity + item.free)
              }).subscribe(() => {
                if (++completed === this.step2Data.length) {
                  this.router.navigate(['user/bill-preview']);
                }
              });
            }
          });
        });
      }
    });
  }

  formatDate(date: string | Date): string {
    return new Date(date).toISOString().split('T')[0];
  }
}
