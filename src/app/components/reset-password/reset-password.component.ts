import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from 'src/app/services/auth-service/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  token: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  resetForm = this.fb.group(
    {
      password: ['', [Validators.required, this.passwordValidator]],
      confirmPassword: ['', Validators.required]
    },
    { validators: this.matchPasswords }
  );

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  /* ---------- Validators ---------- */

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value || '';
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password);

    if (password.length < 8 || !hasUpper || !hasDigit || !hasSpecial) {
      return { invalidPassword: true };
    }
    return null;
  }

  matchPasswords(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  /* ---------- Submit ---------- */

  submit(): void {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const password = this.resetForm.get('password')!.value as string;
    this.authService.resetPassword({
      token: this.token,
      newPassword: password
    }).subscribe({
      next: () => {
        this.successMessage = 'Password reset successful. Redirecting to login...';
        this.errorMessage = null;

        setTimeout(() => this.router.navigate(['/login']), 4000);
      },
      error: () => {
        this.errorMessage = 'Reset link expired or invalid';
        this.successMessage = null;
      }
    });
  }
}
