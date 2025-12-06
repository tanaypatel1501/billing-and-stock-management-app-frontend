import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth-service/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  validateForm!: FormGroup;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  confirmPassword = (control: FormControl): { [s: string]: boolean } => {
    if (!control.value) {
      return { required: true };
    } else if (control.value !== this.validateForm.controls["password"].value) {
      return {
        confirm: true, error: true
      };
    }
    return {};
  }

  constructor(private authService: AuthService,
    private fb: FormBuilder) { }


  ngOnInit() {
    this.validateForm = this.fb.group({
      firstname: [null, [Validators.required]],
      lastname: [null, [Validators.required]],
      email: [null, [Validators.required, Validators.pattern(this.emailPattern)]],
      password: [null, [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirm: [null, [Validators.required, this.confirmPassword]]
    })
  }

  register(data: any) {
    this.authService.register(data).subscribe(
      (res) => {
        console.log(res);
        this.successMessage = 'Registration successful!'; // Set success message
        this.clearMessageAfterDelay(); // Clear success message after 3 seconds
      },
      (error) => {
        console.log(error);
        this.errorMessage = 'Registration failed. Please try again.'; // Set error message
        this.clearMessageAfterDelay(); // Clear error message after 3 seconds
      }
    );
  }

  private clearMessageAfterDelay() {
    setTimeout(() => {
      this.successMessage = null;
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
