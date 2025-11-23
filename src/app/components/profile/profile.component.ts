import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { faPencil, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'; 

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  faPencil = faPencil;
  faCheck = faCheck;
  faTimes = faTimes;
  
  userProfile: any = null;
  
  // Flags to toggle edit mode for specific fields
  isEditing = {
    firstname: false,
    lastname: false,
  };

  // Data binding for inline edits
  editData = {
    firstname: '',
    lastname: '',
  };

  // Password Modal
  showPasswordModal = false;
  passwordForm: FormGroup;
  
  // Custom message for main page feedback
  feedbackMessage: string | null = null;
  isError: boolean = false;

  // State for showing server-side errors specifically inside the modal
  modalErrorMessage: string | null = null;


  constructor(private authService: AuthService, private fb: FormBuilder) {
    // Initialize the password form with the custom password validator
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, this.passwordValidator]]
    });
  }

  ngOnInit(): void {
    this.getProfile();
  }
  
  // Custom password validator matching the one used in Login/Register
  passwordValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.value;
    // Check for special character, capital letter, digit, and minimum length 8
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
    this.authService.getProfile().subscribe(res => {
      this.userProfile = res;
      // Initialize edit data only with editable fields
      this.editData = { 
        firstname: res.firstname,
        lastname: res.lastname
      };
    }, error => {
        this.setFeedback('Failed to load profile data.', true);
    });
  }

  // Enable edit mode for a field
  enableEdit(field: 'firstname' | 'lastname') {
    this.isEditing[field] = true;
  }

  // Cancel edit for a field
  cancelEdit(field: 'firstname' | 'lastname') {
    this.isEditing[field] = false;
    // Reset value back to original
    this.editData[field] = this.userProfile[field];
  }

  // Save profile updates (Firstname, Lastname)
  saveProfile(field: 'firstname' | 'lastname') {
    // Construct DTO (only sending the field being changed for true PATCH)
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
        this.userProfile = res; // Update local display with response data
        this.isEditing[field] = false; // Turn off edit mode
        this.setFeedback('Profile updated successfully!');
      },
      error: (err) => {
        console.error(err);
        this.setFeedback('Failed to update profile.', true);
        this.cancelEdit(field); // Revert local change on error
      }
    });
  }

  // ---- Password Handling ----

  openChangePassword() {
    this.showPasswordModal = true;
    this.passwordForm.reset();
    this.modalErrorMessage = null; // Clear modal error on open
    this.feedbackMessage = null; // Clear main page feedback on open
  }

  closeChangePassword() {
    this.showPasswordModal = false;
    this.modalErrorMessage = null; // Clear modal error on close
  }

  submitPasswordChange() {
    if (this.passwordForm.invalid) return;

    const payload = this.passwordForm.value;
    this.modalErrorMessage = null; // Clear previous error before submission

    this.authService.changePassword(payload).subscribe({
      next: (res) => {
        this.setFeedback('Password changed successfully!');
        this.closeChangePassword();
      },
      error: (err) => {
        console.error(err);
        // Assuming the primary error for this endpoint is the incorrect current password.
        const apiError = err.error?.message || 'Failed to change password. Please verify your current password.';
        
        // Set the error message to be displayed in the modal
        this.modalErrorMessage = apiError; 
      }
    });
  }
}