import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css']
})
export class AddProductComponent implements OnInit {
  productForm!: FormGroup;
  userId!: any;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.productForm = this.fb.group({
      name: [null, Validators.required],
      hsn: [null, Validators.required],
      mrp: [null, [Validators.required, Validators.min(0)]],
      // Default CGST/SGST to 0 so the user can increase them; not strictly required.
      cgst: [0, [Validators.min(0), Validators.max(100)]],
      sgst: [0, [Validators.min(0), Validators.max(100)]],
      packing: [null, Validators.required]
    });
  }

  onSubmit() {
    const productData = {
      name: this.productForm.get('name')?.value,
      hsn: this.productForm.get('hsn')?.value,
      mrp: this.productForm.get('mrp')?.value,
      cgst: (() => {
        const v = this.productForm.get('cgst')?.value;
        const n = Number(v);
        return !isNaN(n) ? n : 0;
      })(),
      sgst: (() => {
        const v = this.productForm.get('sgst')?.value;
        const n = Number(v);
        return !isNaN(n) ? n : 0;
      })(),
      packing: this.productForm.get('packing')?.value
    };

    this.authService.addProduct(productData).subscribe(
      () => {
        this.router.navigate(['admin/dashboard']);
      },
      (error) => {
        console.log(error);
        this.errorMessage = 'Adding product failed.';
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
