import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.scss']
})
export class EditProductComponent implements OnInit {
  productForm!: FormGroup;
  userId!: any;
  errorMessage: string | null = null;
  productId: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId(); 
    this.productId = this.userStorageService.getProductId();
    this.productForm = this.fb.group({
      name: [null, Validators.required],
      hsn: [null, Validators.required],
      mrp: [null, [Validators.required, Validators.min(0)]],
      // Default cgst/sgst to 0 so that empty inputs become 0; keep min/max validators
      cgst: [0, [Validators.min(0), Validators.max(100)]],
      sgst: [0, [Validators.min(0), Validators.max(100)]],
      packing: [null, Validators.required]
    });

    console.log('Product ID:', this.productId); // Log the productId
    this.getProductDetails(this.productId);
  }

  getProductDetails(productId: any) {
    // Call the AuthService to fetch product details by ID
    this.authService.getProductById(productId).subscribe(
      (productData) => {
        console.log('Product Data:', productData); // Log the received data
        // Populate the form with the retrieved data
        this.productForm.patchValue({
          name: productData.name,
          hsn: productData.hsn,
          mrp: productData.mrp,
            cgst: productData.cgst != null ? productData.cgst : 0,
            sgst: productData.sgst != null ? productData.sgst : 0,
          packing: productData.packing
        });
      },
      (error) => {
        console.error(error);
        // Handle error here
      }
    );
  }

  onSubmit() {
    const productData = {
      name: this.productForm.get('name')?.value,
      hsn: this.productForm.get('hsn')?.value,
      mrp: this.productForm.get('mrp')?.value,
      cgst: (() => { const v = this.productForm.get('cgst')?.value; const n = Number(v); return !isNaN(n) ? n : 0; })(),
      sgst: (() => { const v = this.productForm.get('sgst')?.value; const n = Number(v); return !isNaN(n) ? n : 0; })(),
      packing: this.productForm.get('packing')?.value
    };

    this.authService.editProduct(this.productId,productData).subscribe(
      () => {
        this.router.navigate(['admin/dashboard']);
      },
      (error) => {
        console.log(error);
        this.errorMessage = 'Updating product failed.';
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
