import { Component, OnInit,OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-create-bill',
  templateUrl: './create-bill.component.html',
  styleUrls: ['./create-bill.component.css']
})
export class CreateBillComponent implements OnInit,OnDestroy{
  faTrashCan = faTrashCan;
  showError = false;
  billForm1!: FormGroup;
  billForm2!: FormGroup;
  userId!: any;
  stock : any[]= [];
  products: any[] = [];
  selectedProduct: any = null;
  showDropdown = false;
  highlightedIndex = -1;
  quantityPlaceholder = 'Quantity';
  currentStep = 1;
  step1Data: any = {}; 
  billItem: any = {}; 
  stockData:any = {};
  step2Data: any[] = []; 
  subscriptions: Subscription[] = [];
  filteredStock: any[] = [];
  expandedIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.billForm1 = this.fb.group({
      purchaserName: [null, Validators.required],
      dl1:[null, [Validators.required, Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      dl2:[null, [Validators.required, Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      gstin:[null, [Validators.required, Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i)]],
      invoiceDate:[null, Validators.required],
    });
    this.billForm2 = this.fb.group({
      productName: [null, Validators.required],
      productId: [null],
      batchNo:[null, Validators.required],
      quantity:[null, [Validators.required, this.validateQuantity.bind(this)]],
      free:[0, [Validators.required, this.validateQuantity.bind(this)]],
      expiryDate:[null, Validators.required],
      rate: [null, [Validators.required]],
      amount: [null, [Validators.required]],
    });


    const step1Data = {
      purchaserName: null,
      dl1: null,
      dl2: null,
      gstin: null,
      invoiceDate: null,
    };

    

    this.subscriptions.push(this.billForm2.get('productName')!.valueChanges.subscribe(() => {
      setTimeout(() => this.calculateAmount(), 0);
    }));

    this.subscriptions.push(this.billForm2.get('quantity')!.valueChanges.subscribe(() => {
      setTimeout(() => this.calculateAmount(), 0);
    }));

    this.subscriptions.push(this.billForm2.get('rate')!.valueChanges.subscribe(() => {
      setTimeout(() => this.calculateAmount(), 0);
    }));
}
toggleCard(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  collapseAll(): void {
    this.expandedIndex = null;
  }

onProductSearch(): void {
  const searchText = this.billForm2.get('productName')?.value;

  if (!searchText || searchText.length < 2) {
    this.products = [];
    this.showDropdown = false;
    return;
  }

  const body = {
    searchText,
    page: 0,
    size: 10
  };

  this.authService.searchStock(body).subscribe({
    next: (res: any) => {
      const list = res.content ?? res ?? [];

      this.stock = list;

      const seen = new Set<string>();
      this.products = list
        .filter((item: any) => {
          if (seen.has(item.product.name)) return false;
          seen.add(item.product.name);
          return true;
        })
        .map((item: any) => ({
          name: item.product.name,
          packing: item.product.packing
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
  const productName = p.name;

  this.billForm2.patchValue({
    productName: productName,
    batchNo: null,
    quantity: null,
    free: 0,
    expiryDate: null,
    rate: null,
    amount: null
  });

  this.filteredStock = this.stock.filter(
    s => s.product.name === productName
  );

  this.showDropdown = false;
}


openDropdown(): void {
  this.showDropdown = true;
}

onInputBlur(): void {
  setTimeout(() => {
    this.showDropdown = false;
  }, 200);
}

ngOnDestroy() {
  this.subscriptions.forEach(subscription => subscription.unsubscribe());
}

formatDate(dateString: string | number | Date) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  let month = '' + (date.getMonth() + 1);
  let day = '' + date.getDate();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [year, month, day].join('-');
}


calculateAmount() {
  const itemData = this.billForm2.value;
  const selectedProduct = this.stock.find(item => item.product.name === itemData.productName);
  if (selectedProduct) {
      const rate = Number(itemData.rate);
      const quantity = Number(itemData.quantity);
      const cgst = Number(selectedProduct.product.cgst);
      const sgst = Number(selectedProduct.product.sgst);
      const amount = (rate * quantity) + ((rate * quantity) * (cgst + sgst) / 100);
      this.billForm2.get('amount')?.setValue(amount);
  }
}

updateQuantityPlaceholder() {
  const selectedProduct = this.billForm2.get('productName')?.value;
  const selectedBatchNo = this.billForm2.get('batchNo')?.value;

  if (!selectedProduct || !selectedBatchNo) {
    this.quantityPlaceholder = 'Quantity';
    return;
  }

  const item = this.stock.find(
    s => s.product.name === selectedProduct && s.batchNo === selectedBatchNo
  );

  this.quantityPlaceholder = item
    ? `Available quantity: ${item.quantity}`
    : 'Quantity';

  this.billForm2.patchValue({
    productId: item ? item.product.id : null,
    expiryDate: item ? this.formatDate(item.expiryDate) : null
  });
}

validateQuantity(control: AbstractControl) {
  if (this.billForm2) {
    const quantity = Number(this.billForm2.get('quantity')?.value);
    const free = Number(this.billForm2.get('free')?.value);
    const selectedProduct = this.billForm2.get('productName')?.value;
    const selectedBatchNo = this.billForm2.get('batchNo')?.value;
    const item = this.stock.find(item => item.product.name === selectedProduct && item.batchNo === selectedBatchNo);
    if (item && quantity + free > item.quantity) {
      return { invalidQuantity: true };
    }
  }
  return null;
}

nextStep() {
  if (this.currentStep === 1) {
    // Check if the form is valid
    if (this.billForm1.valid) {
      // If the form is valid, store step 1 data and go to the next step
      this.step1Data = this.billForm1.value;
      this.step1Data.userId = this.userId;
      console.log(this.step1Data);
      this.currentStep++;
    } else {
      // If the form is invalid, mark all controls as touched to trigger the error messages
      this.billForm1.markAllAsTouched();
    }
  } else if (this.currentStep < 2) {
    // For other steps, continue as before
    this.currentStep++;
  }
}


addItem() {
  if (this.billForm2.valid) {
    const itemData = this.billForm2.value;
    this.step2Data.push(itemData);
    console.log(this.step2Data)
    this.billForm2.reset();
  } else {
    this.billForm2.markAllAsTouched();
  }
}

  delete(index: number) {
    if (index >= 0 && index < this.step2Data.length) {
      this.step2Data.splice(index, 1); 
      if (this.expandedIndex === index) {
        this.expandedIndex = null;
      } else if (this.expandedIndex !== null && this.expandedIndex > index) {
        this.expandedIndex--;
      }
    }
  }
  

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitBill() {
  if (this.step2Data.length === 0) {
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
    return;
  }

  this.authService.createBill(this.step1Data).subscribe({
    next: (billRes: any) => {
      const billId = billRes.id;
      this.userStorageService.saveBillId(billId);

      let completedOperations = 0;
      const totalOperations = this.step2Data.length;

      this.step2Data.forEach((billItem) => {
        const selectedStock = this.stock.find(
          s =>
            s.product.name === billItem.productName &&
            s.batchNo === billItem.batchNo
        );

        if (!selectedStock) {
          console.error('Stock not found:', billItem);
          completedOperations++;
          if (completedOperations === totalOperations) {
            this.router.navigate(['user/bill-preview']);
          }
          return;
        }

        billItem.billId = billId;
        billItem.productId = billItem.productId || selectedStock.product.id;
        billItem.expiryDate = billItem.expiryDate || this.formatDate(selectedStock.expiryDate);

        this.authService.addBillItem(billItem).subscribe({
          next: () => {
            const newQuantity =
              selectedStock.quantity - (billItem.quantity + billItem.free);

            const stockData = {
              userId: UserStorageService.getUserId(),
              productId: selectedStock.product.id,
              batchNo: selectedStock.batchNo,
              expiryDate: this.formatDate(selectedStock.expiryDate),
              quantity: newQuantity
            };

            this.authService.updateStock(stockData).subscribe({
              next: () => {
                completedOperations++;
                if (completedOperations === totalOperations) {
                  this.router.navigate(['user/bill-preview']);
                }
              },
              error: (err) => {
                console.error('Stock update failed:', err);
                completedOperations++;
                if (completedOperations === totalOperations) {
                  this.router.navigate(['user/bill-preview']);
                }
              }
            });
          },
          error: (err) => {
            console.error('Add bill item failed:', err);
            completedOperations++;
            if (completedOperations === totalOperations) {
              this.router.navigate(['user/bill-preview']);
            }
          }
        });
      });
    },
    error: (err) => {
      console.error('Bill creation failed:', err);
    }
  });
}
}


