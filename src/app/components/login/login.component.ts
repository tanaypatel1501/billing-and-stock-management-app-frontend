import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  validateForm!: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.validateForm = this.fb.group({
      email: [null, [Validators.required, Validators.pattern(this.emailPattern)]],
      password: [null, [Validators.required, this.passwordValidator]]
    });
  }

  login() {
    const emailControl = this.validateForm.get('email');
    const passwordControl = this.validateForm.get('password');

    if (emailControl && passwordControl) {
      this.authService
        .login(emailControl.value, passwordControl.value)
        .subscribe(
          (res: any) => {
            if (UserStorageService.isUserLoggedIn()) {
              this.router.navigateByUrl('user/dashboard');
            } else if (UserStorageService.isAdminLoggedIn()) {
              this.router.navigateByUrl('admin/dashboard');
            }
          },
          (error: { status: number }) => {
            console.log(error);
            if (error.status == 406) {
              // Handle account not active error
              this.errorMessage = 'Account is not active. Please register first.'; 
              this.clearMessageAfterDelay();
            } else {
              // Handle bad credentials error
              this.errorMessage = 'Bad Credentials'; 
              this.clearMessageAfterDelay();
            }
          }
        );
    }
  }

  private clearMessageAfterDelay() {
    setTimeout(() => {
      // this.successMessage = null;
      this.errorMessage = null;
    }, 3000); // 3 seconds delay
  }

  // Custom email pattern (regex)
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

  // Custom password validator
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
