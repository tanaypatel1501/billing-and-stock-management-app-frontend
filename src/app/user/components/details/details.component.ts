import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AddressLookupDTO } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
// Make sure 'of' is not needed here as we use it in the service only

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsComponent implements OnInit {
  detailsForm!: FormGroup;
  userId!: any;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  originalDetails: any = null;
  userHasDetails = false;

  states: string[] = [];
  cities: string[] = [];
  pincodeAddresses: AddressLookupDTO[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.detailsForm = this.fb.group({
      name: [null, [Validators.required, Validators.minLength(2)]],
      addressLine1: [null, [Validators.required, Validators.minLength(3)]],
      addressLine2: [null, [Validators.required, Validators.minLength(3)]],
      state: [null, Validators.required],
      city: [null, Validators.required],
      pincode: [null, [Validators.required, Validators.pattern(/^\d{6}$/)]],
      phoneNumber: [null, [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      dlNo1: [null, [Validators.required, Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      dlNo2: [null, [Validators.required, Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      fssaiReg: [null, Validators.required],
      gstin: [null, [Validators.required, Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i)]],
      bankName: [null, Validators.required],
      accountNumber: [null, [Validators.required, Validators.pattern(/^[0-9]{9,18}$/)]],
      ifscCode: [null, [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],
    });

    this.loadStates();
    this.setupListeners();
    this.checkAndPopulateExistingDetails();
  }

  // --- Core Functionality ---

  private checkAndPopulateExistingDetails(): void {
    this.authService.getDetailsByUserId(this.userId).subscribe(
      (details) => {
        if (details) {
          this.originalDetails = details;
          this.populateFormWithDetails(details);
          this.userHasDetails = true;
          // After populating form with existing details, manually load the dependent lists
          if (details.state && details.city) {
            // Populate dependent lists while preserving the saved selections
            this.loadCities(details.state, details.city);
            this.loadPincodes(details.city, details.state, details.pincode);
          }
        }
      },
      (error) => {
        console.error("Error fetching user details:", error);
        this.userHasDetails = false;
      }
    );
  }

  // --- Postal Service Integration ---

  loadStates(): void {
    this.authService.getAllStates().subscribe(states => {
      this.states = states;
    });
  }
  
  setupListeners(): void {
    // State listener logic remains the same (triggers city load)
    this.detailsForm.get('state')?.valueChanges.subscribe(state => {
      if (state) {
        this.loadCities(state);
      } else {
        this.cities = [];
        this.pincodeAddresses = [];
        this.detailsForm.get('city')?.setValue(null, { emitEvent: false });
        this.detailsForm.get('pincode')?.setValue(null, { emitEvent: false });
      }
    });

    // City listener logic remains the same (triggers pincode load)
    this.detailsForm.get('city')?.valueChanges.subscribe(city => {
      const state = this.detailsForm.get('state')?.value;
      if (city && state) {
        this.loadPincodes(city, state);
      } else {
        this.pincodeAddresses = [];
        this.detailsForm.get('pincode')?.setValue(null, { emitEvent: false });
      }
    });

    // Pincode listener (manual entry reverse lookup)
    this.detailsForm.get('pincode')?.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(pincode => {
        if (pincode && pincode.length === 6) {
            this.lookupAddressByPincode(pincode);
        }
      });
  }

  loadCities(state: string, selectedCity?: string | null): void {
    if (!state) {
      this.cities = [];
      this.detailsForm.get('city')?.setValue(null, { emitEvent: false });
      return;
    }

    this.authService.getCitiesByState(state).subscribe(cities => {
      this.cities = cities;
      const desiredCity = selectedCity ?? this.detailsForm.get('city')?.value;
      if (desiredCity && this.cities.includes(desiredCity)) {
        this.detailsForm.get('city')?.setValue(desiredCity, { emitEvent: false });
      } else {
        this.detailsForm.get('city')?.setValue(null, { emitEvent: false });
      }
    });
  }

  loadPincodes(district: string, state: string, selectedPincode?: string | null): void {
    if (!district || !state) {
      this.pincodeAddresses = [];
      this.detailsForm.get('pincode')?.setValue(null, { emitEvent: false });
      return;
    }

    this.authService.getAddressesByDistrictAndState(district, state).subscribe(addresses => {
      this.pincodeAddresses = addresses;
      const desiredPincode = selectedPincode ?? this.detailsForm.get('pincode')?.value;
      if (desiredPincode && this.pincodeAddresses.some(a => a.pincode === desiredPincode)) {
        this.detailsForm.get('pincode')?.setValue(desiredPincode, { emitEvent: false });
      } else {
        this.detailsForm.get('pincode')?.setValue(null, { emitEvent: false });
      }
    });
  }

  // FIX 1 APPLIED HERE:
  lookupAddressByPincode(pincode: string): void {
    this.authService.lookupPincode(pincode).subscribe(response => {
      console.log('Pincode lookup response:', response);
        if (response) {
          this.errorMessage = null;

          // Patch the values for city and pincode immediately.
          this.detailsForm.patchValue({
            city: response.district,
            pincode: response.pincode
          }, { emitEvent: false });

          // Some backends use different keys for state (e.g. 'statename').
          // Accept common variants so we don't need an extra lookup.
          const respAny: any = response as any;
          const respState = respAny.state ?? respAny.statename ?? respAny.stateName ?? respAny.state_name;

          if (respState) {
            // If state is present under any recognized key, use it directly
            this.detailsForm.patchValue({ state: respState }, { emitEvent: false });
            this.loadCities(respState, response.district);
            this.loadPincodes(response.district, respState, response.pincode);
          } else if (response.district) {
          // Some backends may return district but not state — resolve state by district
          console.log('Resolving state for district:', response.district);
          this.authService.findStateByDistrict(response.district).subscribe(foundState => {
            if (foundState) {
              this.detailsForm.patchValue({ state: foundState }, { emitEvent: false });
              this.loadCities(foundState, response.district);
              this.loadPincodes(response.district, foundState, response.pincode);
            } else {
              this.errorMessage = 'State not found for this pincode.';
              this.clearAddressFields();
            }
          }, err => {
            console.error('Error finding state by district', err);
            this.errorMessage = 'State lookup failed.';
            this.clearAddressFields();
          });
        } else {
          this.errorMessage = 'Pincode lookup returned insufficient address data.';
          this.clearAddressFields();
        }

      } else {
        this.errorMessage = 'Pincode not found.';
        this.clearAddressFields();
      }
    });
  }

  clearAddressFields(): void {
    this.detailsForm.patchValue({
        city: null,
        state: null
    }, { emitEvent: false });
    this.cities = [];
    this.pincodeAddresses = [];
  }

  // --- Form Submission and Helpers ---

  onSubmit(): void {
    if (this.detailsForm.invalid) {
        this.errorMessage = 'Please check all fields for errors.';
        this.detailsForm.markAllAsTouched();
        this.clearMessageAfterDelay();
        return;
    }

    const formValues = this.detailsForm.value;
    // If we already have original details, merge them with the form values
    // so we always send a complete DTO to the backend (PUT expects full DTO).
    const details = this.userHasDetails && this.originalDetails ? { ...this.originalDetails, ...formValues } : { ...formValues };
    details.userId = this.userId;

    // ... (rest of onSubmit logic for addDetails/editDetails) ...
    if (this.userHasDetails) {
      this.authService.editDetails(this.userId, details).subscribe(
        (updated) => {
          this.successMessage = 'Details updated successfully.';
          this.clearSuccessAfterDelay();
          // Update originalDetails to latest returned DTO and refresh form
          this.originalDetails = updated;
          this.populateFormWithDetails(updated);
        },
        (error) => { this.errorMessage = 'Updating details failed.'; this.clearMessageAfterDelay(); }
      );
    } else {
      this.authService.addDetails(this.userId, details).subscribe(
        (created) => {
          this.successMessage = 'Details added successfully.';
          this.userHasDetails = true;
          this.clearSuccessAfterDelay();
          this.originalDetails = created;
          this.populateFormWithDetails(created);
        },
        (error) => { this.errorMessage = 'Adding details failed.'; this.clearMessageAfterDelay(); }
      );
    }
  }

  private clearSuccessAfterDelay() {
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  private populateFormWithDetails(details: any) {
    // Use patchValue without {emitEvent: false} here IF you want the listeners to run automatically
    // and load subsequent dropdowns upon initial form load.
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
    }, { emitEvent: false });
    // Because we need the manual loads in checkAndPopulateExistingDetails() anyway,
    // using emitEvent: false here is safer to prevent double API calls, as done in the previous step.
  }

  private clearMessageAfterDelay() {
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }
}
