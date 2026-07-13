import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { ConfigService } from 'src/app/services/config.service';
import { GoogleAuthService } from 'src/app/services/google-auth/google-auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  validateForm!: FormGroup;
  errorMessage: string | null = null;
  showResendLink = false;
  unverifiedEmail = '';
  resendMessage: string | null = null;
  isResending = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private config: ConfigService,
    private googleAuth: GoogleAuthService
  ) {}

  ngOnInit(): void {
    this.validateForm = this.fb.group({
      email: [null, [Validators.required, Validators.pattern(this.emailPattern)]],
      password: [null, [Validators.required, this.passwordValidator]]
    });

    setTimeout(() => {
      this.googleAuth.init((response) => this.handleGoogleCredential(response));
      this.googleAuth.renderButton('googleLoginButton');
    }, 100);
  }

  ngOnDestroy(): void {
    this.googleAuth.cancel();
  }

  handleGoogleCredential(response: any): void {
    this.authService.googleSignIn(response.credential).subscribe({
      next: () => {
        if (UserStorageService.isUserLoggedIn()) {
          this.router.navigateByUrl('user/dashboard');
        } else if (UserStorageService.isAdminLoggedIn()) {
          this.router.navigateByUrl('admin/dashboard');
        }
      },
      error: () => {
        this.errorMessage = 'Google sign-in failed. Please try again.';
        this.clearMessageAfterDelay();
      }
    });
  }

  login() {
    const emailControl = this.validateForm.get('email');
    const passwordControl = this.validateForm.get('password');
    if (emailControl && passwordControl) {
      this.showResendLink = false;
      this.authService.login(emailControl.value, passwordControl.value).subscribe({
        next: (res: any) => {
          if (UserStorageService.isUserLoggedIn()) {
            this.router.navigateByUrl('user/dashboard');
          } else if (UserStorageService.isAdminLoggedIn()) {
            this.router.navigateByUrl('admin/dashboard');
          }
        },
        error: (error: any) => {
          if (error.status === 403 && error.error?.error === 'EMAIL_NOT_VERIFIED') {
            this.errorMessage = 'Please verify your email before logging in.';
            this.showResendLink = true;
            this.unverifiedEmail = emailControl.value;
          } else if (error.status === 406) {
            this.errorMessage = 'Account is not active. Please register first.';
          } else {
            this.errorMessage = 'Incorrect email or password.';
          }
          this.clearMessageAfterDelay();
        }
      });
    }
  }

  resendVerification(): void {
    if (!this.unverifiedEmail || this.isResending) return;
    this.isResending = true;
    this.authService.resendVerification(this.unverifiedEmail).subscribe({
      next: () => {
        this.resendMessage = 'Verification email sent! Please check your inbox.';
        this.showResendLink = false;
        this.isResending = false;
        setTimeout(() => (this.resendMessage = null), 5000);
      },
      error: () => {
        this.resendMessage = 'Failed to resend. Please try again.';
        this.isResending = false;
        setTimeout(() => (this.resendMessage = null), 5000);
      }
    });
  }

  private clearMessageAfterDelay() {
    setTimeout(() => { this.errorMessage = null; }, 4000);
  }

  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

  passwordValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.value;
    const hasSpecialChar = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\]/.test(password);
    const hasCapitalLetter = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    if (!hasSpecialChar || !hasCapitalLetter || !hasDigit || password.length < 8) {
      return { 'invalidPassword': true };
    }
    return null;
  }
}