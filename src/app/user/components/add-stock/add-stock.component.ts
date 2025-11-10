import { Component, OnInit } from '@angular/core';
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
  userId!: any;
  errorMessage: string | null = null;
  products: any[] = []; // Property to store the list of products

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.productForm = this.fb.group({
      name: [null, Validators.required],
      batchNo: [null, Validators.required],
      expiryDate: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });

    // Fetch and populate the product list on component initialization
    this.authService.getProducts(this.userId).subscribe(
      (response: any) => {
        this.products = response; // Store the list of products
      },
      (error) => {
        console.log(error);
        // Handle error if necessary
      }
    );
  }

  onSubmit() {
    const stockData = {
      userId : UserStorageService.getUserId(),
      productId: this.productForm.get('name')?.value,
      batchNo: this.productForm.get('batchNo')?.value,
      expiryDate: this.productForm.get('expiryDate')?.value,
      quantity: this.productForm.get('quantity')?.value,
    };
    console.log('Stock Data:', stockData);

    this.authService.addStock(stockData).subscribe(
      () => {
        this.router.navigate(['user/dashboard']);
      },
      (error) => {
        console.log(error);
        this.errorMessage = 'Adding stock failed.';
        this.clearMessageAfterDelay();
      }
    );
  }

  private clearMessageAfterDelay() {
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }
}
