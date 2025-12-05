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
  selectedProduct: any;
  quantityPlaceholder = 'Quantity';
  currentStep = 1;
  itemAdded: boolean = false;
  step1Data: any = {}; 
  billItem: any = {}; 
  stockData:any = {};
  step2Data: any[] = []; 
  subscriptions: Subscription[] = [];
  filteredStock: any[] = [];

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

    // Fetch and populate the product list on component initialization
    this.authService.getStock(this.userId).subscribe(
      (response: any) => {
        this.stock = response; // Store the list of products in stock and their quantity
      },
      (error) => {
        console.log(error);
        // Handle error if necessary
      }
    );

    this.subscriptions.push(this.billForm2.get('productName')!.valueChanges.subscribe(() => {
      setTimeout(() => this.calculateAmount(), 0);
    }));

    this.subscriptions.push(this.billForm2.get('quantity')!.valueChanges.subscribe(() => {
      setTimeout(() => this.calculateAmount(), 0);
    }));

    this.subscriptions.push(this.billForm2.get('rate')!.valueChanges.subscribe(() => {
      setTimeout(() => this.calculateAmount(), 0);
    }));

    this.subscriptions.push(this.billForm2.get('productName')!.valueChanges.subscribe((selectedProduct) => {
      this.filteredStock = this.stock.filter(item => item.product.name === selectedProduct);
    }));
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
  if (this.billForm2.contains('productName') && this.billForm2.contains('batchNo')) {
    const selectedProduct = this.billForm2.get('productName')?.value;
    const selectedBatchNo = this.billForm2.get('batchNo')?.value;
    const item = this.stock.find(item => item.product.name === selectedProduct && item.batchNo === selectedBatchNo);
      
    this.quantityPlaceholder = item ? `Available quantity: ${item.quantity}` : 'Quantity';

    this.billForm2.get('productId')?.setValue(item ? item.product.id : null);
    this.billForm2.get('expiryDate')?.setValue(item ? this.formatDate(item.expiryDate) : null);  
  }
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
    // If the form is valid, add the item
    const itemData = this.billForm2.value;
    this.step2Data.push(itemData);
    console.log(this.step2Data)
    this.billForm2.reset();
    this.itemAdded = true;
  } else {
    // If the form is invalid, mark all controls as touched to trigger the error messages
    this.billForm2.markAllAsTouched();
  }
}

  delete(index: number) {
    if (index >= 0 && index < this.step2Data.length) {
      this.step2Data.splice(index, 1); 
    }
  }
  

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitBill() {
    if (this.step2Data.length > 0) {
      // Call your AuthService method to create the bill
      this.authService.createBill(this.step1Data).subscribe(
        (response: any) => {
          // Handle success 
          let billId = response.id; // Assuming the response contains the billId
          console.log('Created Bill with ID:', billId);
    
          for (let billItem of this.step2Data) {
            // Add the billId to each billItem
            billItem.billId = billId;
            console.log('Adding Bill Item:', billItem);
    
            this.authService.addBillItem(billItem).subscribe(
              (response: any) => {
                // Handle success 
                console.log('Added Bill Item:', response);
              },
              (error) => {
                console.error('Error adding Bill Item:', error);
                // Handle error if necessary
              }
            );
    
            const selectedProduct = this.stock.find(item => item.product.name === billItem.productName && item.batchNo === billItem.batchNo);
            if (selectedProduct) {
              const availableQuantity = selectedProduct.quantity;
              const newQuantity = availableQuantity - (billItem.quantity + billItem.free); 
              console.log("Selected Product: ", selectedProduct);
              console.log("Available Quantity: ", availableQuantity);
              console.log("New Quantity: ", newQuantity);
              this.stockData = {
                userId: this.userId = UserStorageService.getUserId(),
                productId: billItem.productId,
                quantity: newQuantity, // Update the quantity based on your calculation
                batchNo : billItem.batchNo,
                expiryDate : billItem.expiryDate,
              };
              console.log("Stock Data: ", this.stockData);
              this.authService.updateStock(this.stockData).subscribe(
                (response: any) => {
                  // Handle success 
                  console.log('Updated Stock:', response);
                },
                (error) => {
                  console.error('Error updating Stock:', error);
                  // Handle error if necessary
                }
              );
            }
          }
    
          this.userStorageService.saveBillId(billId);
          console.log('Saved Bill ID:', billId);
          this.router.navigate(['user/bill-preview']);
        },
        (error) => {
          console.error('Error creating Bill:', error);
          // Handle error if necessary
        },
      );
    } else {
      // If there are no items in the bill, display an error message
      this.showError = true;
      setTimeout(() => this.showError = false, 3000);
    }
  }  
}


