import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsComponent implements OnInit {
  detailsForm!: FormGroup;
  userId!: any;
  errorMessage: string | null = null;
  userHasDetails = false; // Flag to check if user has details

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.detailsForm = this.fb.group({
      name: [null, Validators.required],
      addressLine1: [null], 
      addressLine2: [null],
      city: [null, Validators.required],
      state: [null, Validators.required],
      pincode: [null, Validators.required],
      phoneNumber: [null, Validators.required],
      dlNo1: [null, Validators.required],
      dlNo2: [null, Validators.required],
      fssaiReg: [null, Validators.required],
      gstin: [null, Validators.required],
      bankName: [null, Validators.required],
      accountNumber: [null, Validators.required],
      ifscCode: [null, Validators.required],
    });

    // Check if the user has details already
    this.authService.getDetailsByUserId(this.userId).subscribe(
      (details) => {
        if (details) {
          // Populate the form with existing details
          this.populateFormWithDetails(details);
          this.userHasDetails = true;
        }
      },
      (error) => {
        console.error(error);
        this.userHasDetails = false;
      }
    );
  }

  onSubmit() {
    const details = this.detailsForm.value;
    details.userId = this.userId; // Add this line

    if (this.userHasDetails) {
      // User has details, so update them
      this.authService.editDetails(this.userId, details).subscribe(
        () => {
          this.router.navigate(['user/dashboard']);
        },
        (error) => {
          console.log(error);
          this.errorMessage = 'Updating details failed.';
          this.clearMessageAfterDelay();
        }
      );
    } else {
      // User doesn't have details, so add them
      this.authService.addDetails(this.userId,details).subscribe(
        () => {
          this.router.navigate(['user/dashboard']);
        },
        (error) => {
          console.log(error);
          this.errorMessage = 'Adding details failed.';
          this.clearMessageAfterDelay();
        }
      );
    }
  }

  private populateFormWithDetails(details: any) {
    // Populate form controls with existing details
    this.detailsForm.patchValue({
      name: details.name,
      addressLine1: details.addressLine1,
      addressLine2: details.addressLine2,
      city: details.city,
      state: details.state,
      pincode: details.pincode,
      phoneNumber: details.phoneNumber,
      dlNo1: details.dlNo1,
      dlNo2: details.dlNo2,
      fssaiReg: details.fssaiReg,
      gstin: details.gstin,
      bankName: details.bankName,
      accountNumber: details.accountNumber,
      ifscCode: details.ifscCode
    });
  }

  private clearMessageAfterDelay() {
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }
}
