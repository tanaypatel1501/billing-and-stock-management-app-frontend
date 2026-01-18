import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AddressLookupDTO } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AppStateService } from 'src/app/services/app-state.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { fas } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  standalone: false,
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
  
  // Logo properties
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  defaultLogoUrl = 'assets/images/default-gst-medicose.png';
  previewLogoUrl: string | null = null;
  isUploadingLogo = false;

  imageChangedEvent: any = '';
  showCropModal = false;
  croppedImageBase64: string | null = null;
  croppedImageFile: File | null = null;
  zoomScale = 1;
  transform = { scale: 1 };
  fileInputRef: HTMLInputElement | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private appState: AppStateService
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
    this.appState.setDetailsValid(!!this.detailsForm.valid);
    this.checkAndPopulateExistingDetails();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      this.errorMessage = 'Only PNG or JPG images are allowed.';
      this.clearMessageAfterDelay();
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'Logo size must be under 2 MB.';
      this.clearMessageAfterDelay();
      input.value = '';
      return;
    }
    this.fileInputRef = input;
    this.imageChangedEvent = event;
    this.showCropModal = true;
  }

  zoomIn() {
    // Limit max zoom to 3x
    if (this.zoomScale < 3) {
      this.zoomScale += 0.1;
      this.transform = {
        ...this.transform,
        scale: this.zoomScale
      };
    }
  }

  zoomOut() {
    // Limit min zoom to 0.5x
    if (this.zoomScale > 0.5) {
      this.zoomScale -= 0.1;
      this.transform = {
        ...this.transform,
        scale: this.zoomScale
      };
    }
  }
  imageCropped(event: ImageCroppedEvent) {
    this.croppedImageBase64 = event.base64 || null;

    if (event.base64) {
      const blob = this.base64ToBlob(event.base64);
      this.croppedImageFile = new File([blob], 'logo.png', { type: 'image/png' });
    }
  }

  confirmCrop(): void {
    if (!this.croppedImageBase64 || !this.croppedImageFile) {

    this.logoPreviewUrl = this.croppedImageBase64;
    this.previewLogoUrl = this.croppedImageBase64;
    this.selectedLogoFile = this.croppedImageFile;
    }
    this.closeCropModal();
  }

  closeCropModal(): void {
    this.showCropModal = false;
    this.imageChangedEvent = null;
    this.zoomScale = 1;
    this.transform = { scale: 1 };

    if (this.fileInputRef) {
      this.fileInputRef.value = '';
      this.fileInputRef = null;
    }
  }

  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(',')[1]);
    const array = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      array[i] = byteString.charCodeAt(i);
    }
    return new Blob([array], { type: 'image/png' });
  }

  resetLogo(): void {
    if (confirm('Are you sure you want to reset to the default logo?')) {
      this.selectedLogoFile = null;
      this.logoPreviewUrl = null;
      this.previewLogoUrl = null;
      this.successMessage = 'Logo will be reset to default on save.';
      this.clearSuccessAfterDelay();
    }
  }

  // --- Core Functionality ---

  private checkAndPopulateExistingDetails(): void {
    this.authService.getDetailsByUserId(this.userId).subscribe(
      (details) => {
        if (details) {
          this.originalDetails = details;
          this.populateFormWithDetails(details);
          this.userHasDetails = true;
          
          // Load existing logo if available
          if (details.logoUrl) {
            this.logoPreviewUrl = details.logoUrl;
            this.previewLogoUrl = details.logoUrl;
          }
          
          // Populate dependent lists while preserving the saved selections
          if (details.state && details.city) {
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
    // State listener
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

    // City listener
    this.detailsForm.get('city')?.valueChanges.subscribe(city => {
      const state = this.detailsForm.get('state')?.value;
      if (city && state) {
        this.loadPincodes(city, state);
      } else {
        this.pincodeAddresses = [];
        this.detailsForm.get('pincode')?.setValue(null, { emitEvent: false });
      }
    });

    // Pincode listener
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

    // Form validity listener
    this.detailsForm.statusChanges
      .pipe(debounceTime(150))
      .subscribe(() => {
        this.appState.setDetailsValid(!!this.detailsForm.valid);
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

  lookupAddressByPincode(pincode: string): void {
    this.authService.lookupPincode(pincode).subscribe(response => {
      console.log('Pincode lookup response:', response);
      if (response) {
        this.errorMessage = null;

        this.detailsForm.patchValue({
          city: response.district,
          pincode: response.pincode
        }, { emitEvent: false });

        const respAny: any = response as any;
        const respState = respAny.state ?? respAny.statename ?? respAny.stateName ?? respAny.state_name;

        if (respState) {
          this.detailsForm.patchValue({ state: respState }, { emitEvent: false });
          this.loadCities(respState, response.district);
          this.loadPincodes(response.district, respState, response.pincode);
        } else if (response.district) {
          console.log('Resolving state for district:', response.district);
          this.authService.findStateByDistrict(response.district).subscribe(foundState => {
            if (foundState) {
              this.detailsForm.patchValue({ state: foundState }, { emitEvent: false });
              this.loadCities(foundState, response.district);
              this.loadPincodes(response.district, foundState, response.pincode);
            } else {
              this.errorMessage = 'State not found for this pincode.';
              this.clearAddressFields();
              this.clearMessageAfterDelay();
            }
          }, err => {
            console.error('Error finding state by district', err);
            this.errorMessage = 'State lookup failed.';
            this.clearAddressFields();
            this.clearMessageAfterDelay();
          });
        } else {
          this.errorMessage = 'Pincode lookup returned insufficient address data.';
          this.clearAddressFields();
          this.clearMessageAfterDelay();
        }
      } else {
        this.errorMessage = 'Pincode not found.';
        this.clearAddressFields();
        this.clearMessageAfterDelay();
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

  // --- Form Submission ---

  onSubmit(): void {
    if (this.detailsForm.invalid) {
      this.errorMessage = 'Please check all fields for errors.';
      this.detailsForm.markAllAsTouched();
      this.clearMessageAfterDelay();
      return;
    }

    this.isUploadingLogo = true;
    const formValues = this.detailsForm.value;
    const details = this.userHasDetails && this.originalDetails 
      ? { ...this.originalDetails, ...formValues } 
      : { ...formValues };
    details.userId = this.userId;

    if (this.userHasDetails) {
      this.authService.editDetails(this.userId, details, this.selectedLogoFile || undefined)
        .subscribe(
          (updated) => {
            this.successMessage = 'Details updated successfully.';
            this.clearSuccessAfterDelay();
            this.originalDetails = updated;
            this.populateFormWithDetails(updated);
            this.selectedLogoFile = null;
            this.isUploadingLogo = false;
            
            // Update logo preview if new logo URL is returned
            if (updated.logoUrl) {
              this.logoPreviewUrl = updated.logoUrl;
              this.previewLogoUrl = updated.logoUrl;
            }
          },
          (error) => {
            this.errorMessage = 'Updating details failed.';
            this.clearMessageAfterDelay();
            this.isUploadingLogo = false;
          }
        );
    } else {
      this.authService.addDetails(this.userId, details, this.selectedLogoFile || undefined)
        .subscribe(
          (created) => {
            this.successMessage = 'Details added successfully.';
            this.userHasDetails = true;
            this.clearSuccessAfterDelay();
            this.originalDetails = created;
            this.populateFormWithDetails(created);
            this.selectedLogoFile = null;
            this.isUploadingLogo = false;
            
            // Update logo preview if new logo URL is returned
            if (created.logoUrl) {
              this.logoPreviewUrl = created.logoUrl;
              this.previewLogoUrl = created.logoUrl;
            }
          },
          (error) => {
            this.errorMessage = 'Adding details failed.';
            this.clearMessageAfterDelay();
            this.isUploadingLogo = false;
          }
        );
    }
  }

  private populateFormWithDetails(details: any): void {
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
    
    this.appState.setDetailsValid(!!this.detailsForm.valid);
  }

  // --- Helper Methods ---

  private clearSuccessAfterDelay(): void {
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }
}