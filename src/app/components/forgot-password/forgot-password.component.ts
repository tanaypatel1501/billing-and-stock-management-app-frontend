import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth-service/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  submit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService.forgotPassword(this.forgotForm.value.email!)
      .subscribe({
        next: () => {
          this.successMessage = 'Reset link sent to your email';
          this.errorMessage = null;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Something went wrong. Please try again later.';
          this.successMessage = null;
          this.loading = false;
        }
      });
  }
}
