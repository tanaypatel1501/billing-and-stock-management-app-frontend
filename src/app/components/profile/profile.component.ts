import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { faPencil, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'; 

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  faPencil = faPencil;
  faCheck = faCheck;
  faTimes = faTimes;

  userId!: any;
  userProfile: any = null;

  isEditing = {
    firstname: false,
    lastname: false,
  };

  editData = {
    firstname: '',
    lastname: '',
  };

  showPasswordModal = false;
  passwordForm: FormGroup;

  feedbackMessage: string | null = null;
  isError: boolean = false;

  modalErrorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private requestCache: RequestCacheService   
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, this.passwordValidator]]
    });
  }

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();   
    this.getProfile();
  }

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

  setFeedback(message: string, isError: boolean = false) {
    this.feedbackMessage = message;
    this.isError = isError;
    setTimeout(() => {
      this.feedbackMessage = null;
    }, 4000);
  }

  getProfile() {
    const cacheKey = `profile:${this.userId}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.applyProfile(cached);
      return;
    }

    this.authService.getProfile().subscribe(res => {
      this.requestCache.set(cacheKey, res);
      this.applyProfile(res);
    }, error => {
      this.setFeedback('Failed to load profile data.', true);
    });
  }

  private applyProfile(res: any): void {
    this.userProfile = res;
    this.editData = {
      firstname: res.firstname,
      lastname: res.lastname
    };
  }

  enableEdit(field: 'firstname' | 'lastname') {
    this.isEditing[field] = true;
  }

  cancelEdit(field: 'firstname' | 'lastname') {
    this.isEditing[field] = false;
    this.editData[field] = this.userProfile[field];
  }

  saveProfile(field: 'firstname' | 'lastname') {
    const updatePayload: any = {};
    let hasChanged = false;

    if (field === 'firstname' && this.editData.firstname !== this.userProfile.firstname) {
      updatePayload.firstname = this.editData.firstname;
      hasChanged = true;
    } else if (field === 'lastname' && this.editData.lastname !== this.userProfile.lastname) {
      updatePayload.lastname = this.editData.lastname;
      hasChanged = true;
    }

    if (!hasChanged) {
      this.isEditing[field] = false;
      return;
    }

    this.authService.updateProfile(updatePayload).subscribe({
      next: (res) => {
        this.userProfile = res;
        this.requestCache.set(`profile:${this.userId}`, res); 
        this.isEditing[field] = false;
        this.setFeedback('Profile updated successfully!');
      },
      error: (err) => {
        console.error(err);
        this.setFeedback('Failed to update profile.', true);
        this.cancelEdit(field);
      }
    });
  }

  // ---- Password Handling ----

  openChangePassword() {
    this.showPasswordModal = true;
    this.passwordForm.reset();
    this.modalErrorMessage = null;
    this.feedbackMessage = null;
  }

  closeChangePassword() {
    this.showPasswordModal = false;
    this.modalErrorMessage = null;
  }

  submitPasswordChange() {
    if (this.passwordForm.invalid) return;

    const payload = this.passwordForm.value;
    this.modalErrorMessage = null;

    this.authService.changePassword(payload).subscribe({
      next: (res) => {
        this.setFeedback('Password changed successfully!');
        this.closeChangePassword();
      },
      error: (err) => {
        console.error(err);
        const apiError = err.error?.message || 'Failed to change password. Please verify your current password.';
        this.modalErrorMessage = apiError;
      }
    });
  }
}