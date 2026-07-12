import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { ConfigService } from 'src/app/services/config.service';

declare const google: any;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  validateForm!: FormGroup;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  registered = false;

  confirmPassword = (control: FormControl): { [s: string]: boolean } => {
    if (!control.value) {
      return { required: true };
    } else if (control.value !== this.validateForm.controls["password"].value) {
      return { confirm: true, error: true };
    }
    return {};
  }

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private config: ConfigService
  ) { }

  ngOnInit() {
    this.validateForm = this.fb.group({
      firstname: [null, [Validators.required]],
      lastname: [null, [Validators.required]],
      email: [null, [Validators.required, Validators.pattern(this.emailPattern)]],
      password: [null, [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirm: [null, [Validators.required, this.confirmPassword]]
    });
    
    setTimeout(() => this.initGoogleSignIn(), 100);
  }

  private initGoogleSignIn(): void {

    if (typeof google === 'undefined') {
      return;
    }

    google.accounts.id.initialize({
      client_id: this.config.googleClientId,
      callback: (response: any) => {

        this.handleGoogleCredential(response);

      }
    });

    google.accounts.id.renderButton(
      document.getElementById('googleLoginButton'),
      {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 430
      }
    );
  }

  handleGoogleCredential(response: any): void {
    this.authService.googleSignIn(response.credential).subscribe({
      next: () => {
        if (UserStorageService.isUserLoggedIn()) {
          this.router.navigateByUrl('user/dashboard');
        }
      },
      error: () => {
        this.errorMessage = 'Google sign-up failed. Please try again.';
        this.clearMessageAfterDelay();
      }
    });
  }

  register(data: any) {
    this.authService.register(data).subscribe({
      next: () => {
        this.registered = true; 
      },
      error: (error) => {
        this.errorMessage = error?.error || 'Registration failed. Please try again.';
        this.clearMessageAfterDelay();
      }
    });
  }

  private clearMessageAfterDelay() {
    setTimeout(() => {
      this.successMessage = null;
      this.errorMessage = null;
    }, 3000);
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