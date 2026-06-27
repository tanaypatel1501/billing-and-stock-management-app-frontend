import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { faUpload } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  @Input() mode: 'add' | 'edit' = 'add';

  productForm!: FormGroup;
  userId!: any;
  productId: any;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  bulkModalOpen = false;
  faUpload = faUpload;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private requestCache: RequestCacheService
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.productForm = this.fb.group({
      name: [null, Validators.required],
      hsn: [null, Validators.required],
      mrp: [null, [Validators.required, Validators.min(0)]],
      cgst: [0, [Validators.min(0), Validators.max(100)]],
      sgst: [0, [Validators.min(0), Validators.max(100)]],
      packing: [null, Validators.required]
    });

    if (this.mode === 'edit') {
      this.productId = this.userStorageService.getProductId();
      this.getProductDetails(this.productId);
    }
  }

  getProductDetails(productId: any) {
    const cacheKey = `product:${productId}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.applyProductData(cached);
      return;
    }

    this.authService.getProductById(productId).subscribe(
      (productData) => {
        this.requestCache.set(cacheKey, productData);
        this.applyProductData(productData);
      },
      (error) => {
        console.error(error);
      }
    );
  }

  private applyProductData(productData: any): void {
    this.productForm.patchValue({
      name: productData.name,
      hsn: productData.hsn,
      mrp: productData.mrp,
      cgst: productData.cgst != null ? productData.cgst : 0,
      sgst: productData.sgst != null ? productData.sgst : 0,
      packing: productData.packing
    });
  }

  onBulkResult(event: { success: boolean; payload: any }) {
    this.bulkModalOpen = false;
    if (event.success) {
      try {
        const p = event.payload;
        if (p && (p.processed !== undefined || p.created !== undefined || p.updated !== undefined || p.failed !== undefined)) {
          const processed = p.processed ?? '-';
          const created = p.created ?? '-';
          const updated = p.updated ?? '-';
          const failed = p.failed ?? '-';
          this.successMessage = `Bulk Upload Summary: Processed: ${processed}, Created: ${created}, Updated: ${updated}, Failed: ${failed}.`;
        } else {
          this.successMessage = JSON.stringify(event.payload, null, 2);
        }
      } catch {
        this.successMessage = String(event.payload);
      }
      this.clearSuccessAfterDelay();
    } else {
      const payload = event.payload;
      let msg = 'Bulk upload failed.';
      try { msg = payload?.error || payload?.message || JSON.stringify(payload); } catch { msg = String(payload); }
      this.errorMessage = msg;
      this.clearMessageAfterDelay();
    }
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

    if (this.mode === 'edit') {
      this.authService.editProduct(this.productId, productData).subscribe(
        () => {
          this.requestCache.invalidateMany(['products:', `product:${this.productId}`]);
          this.router.navigate(['admin/dashboard']);
        },
        (error) => {
          console.log(error);
          this.errorMessage = 'Updating product failed.';
          this.clearMessageAfterDelay();
        }
      );
    } else {
      this.authService.addProduct(productData).subscribe(
        () => {
          this.requestCache.invalidate('products:');
          this.router.navigate(['admin/dashboard']);
        },
        (error) => {
          console.log(error);
          this.errorMessage = 'Adding product failed.';
          this.clearMessageAfterDelay();
        }
      );
    }
  }

  private clearMessageAfterDelay() {
    setTimeout(() => { this.errorMessage = null; }, 5000);
  }

  private clearSuccessAfterDelay() {
    setTimeout(() => { this.successMessage = null; }, 5000);
  }
}