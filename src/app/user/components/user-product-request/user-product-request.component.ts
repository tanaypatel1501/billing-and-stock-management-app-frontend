import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, ProductRequestDTO } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-user-product-request',
  templateUrl: './user-product-request.component.html',
  styleUrls: ['./user-product-request.component.scss']
})
export class UserProductRequestComponent implements OnInit {

  requestForm!: FormGroup;
  isSubmitting = false;
  submitted = false;
  errorMessage: string | null = null;
  lastSubmittedName = '';
  myRequests: ProductRequestDTO[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadMyRequests();
  }

  buildForm(): void {
    this.requestForm = this.fb.group({
      name:    ['', [Validators.required, Validators.minLength(2)]],
      packing: [''],
      HSN:     [''],
      MRP:     [null],
      taxMode: ['cgst_sgst'],
      CGST:    [null],
      SGST:    [null],
      IGST:    [null],
      notes:   ['']
    });
  }

  onTaxModeChange(): void {
    if (this.requestForm.get('taxMode')?.value === 'igst') {
      this.requestForm.get('CGST')?.setValue(null);
      this.requestForm.get('SGST')?.setValue(null);
    } else {
      this.requestForm.get('IGST')?.setValue(null);
    }
  }

  loadMyRequests(): void {
    const userId = UserStorageService.getUserId();
    if (!userId) return;

    this.authService.getMyProductRequests(userId).subscribe({
      next: (data) => { this.myRequests = data; },
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const userId = UserStorageService.getUserId();
    if (!userId) {
      this.errorMessage = 'Session expired. Please log in again.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const formValue = this.requestForm.value;
    let finalCGST = formValue.CGST;
    let finalSGST = formValue.SGST;

    if (formValue.taxMode === 'igst' && formValue.IGST !== null) {
      const splitTax = formValue.IGST / 2;
      finalCGST = splitTax;
      finalSGST = splitTax;
    }

    // Explicitly typing as ProductRequestDTO satisfies the strict string literal check
    const dto: ProductRequestDTO = {
      name: formValue.name,
      packing: formValue.packing || '',
      hsn: formValue.HSN || null,
      mrp: formValue.MRP || null,
      notes: formValue.notes || '',
      cgst: finalCGST,
      sgst: finalSGST,
      status: 'PENDING' // TypeScript now correctly evaluates this as the specific literal type
    };

    this.authService.submitProductRequest(dto, userId).subscribe({
      next: (saved) => {
        this.lastSubmittedName = saved.name || dto.name;
        this.submitted = true;
        this.isSubmitting = false;
        this.loadMyRequests(); // refresh the list
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to submit request. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  resetForm(): void {
    this.submitted = false;
    this.buildForm();
  }
}