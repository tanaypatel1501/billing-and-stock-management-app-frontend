import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, PageResponse } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { SearchBarComponent } from 'src/app/shared/search-bar/search-bar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUser, faIdCard, faPencil, faFileInvoice,
  faSearch, faXmark, faArrowLeft, faUsers
} from '@fortawesome/free-solid-svg-icons';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';

const PATTERNS = {
  GST:     /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i,
  PAN:     /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
  AADHAAR: /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/
};

@Component({
  selector: 'app-purchasers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    SearchBarComponent
  ],
  templateUrl: './purchasers.component.html',
  styleUrls: ['./purchasers.component.scss']
})
export class PurchasersComponent implements OnInit {

  faUser = faUser; faIdCard = faIdCard; faPencil = faPencil;
  faTrashCan = faTrashCan; faFileInvoice = faFileInvoice;
  faSearch = faSearch; faXmark = faXmark;
  faArrowLeft = faArrowLeft; faUsers = faUsers;

  userId!: number;
  allPurchasers: any[] = [];
  filtered: any[] = [];

  // search
  searchText = '';
  suggestions: any[] = [];
  isSuggestionLoading = false;

  // pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 20;
  isLastPage = false;

  isLoading = true;

  // edit modal
  showModal = false;
  editForm!: FormGroup;
  editingId: number | null = null;
  documentType: 'GST' | 'PAN' | 'AADHAAR' = 'GST';
  saving = false;

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private scrollThrottleTimeout: any = null;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private appState: AppStateService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.buildForm();
    this.load(0, false);
    this.subscriptions.push(
    this.searchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged()
      ).subscribe(text => this.performSuggestionSearch(text))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.scrollThrottleTimeout) clearTimeout(this.scrollThrottleTimeout);
  }

  buildForm(): void {
    this.editForm = this.fb.group({
      name:  [null, Validators.required],
      dl1:   [null, [Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      dl2:   [null, [Validators.pattern(/^[A-Z0-9\-\/\s]{10,30}$/i)]],
      gstin: [null, [Validators.pattern(PATTERNS.GST)]]
    });
  }

  /* ---------- Load ---------- */

  load(page: number = 0, append: boolean = false): void {
    this.isLoading = true;

    this.authService.getAllPurchasers(this.userId, {
      page,
      size: this.pageSize,
      searchText: this.searchText
    }).subscribe({
      next: (data: PageResponse<any>) => {

        const incoming = data.content ?? [];

        this.allPurchasers = append
          ? [...this.allPurchasers, ...incoming]
          : incoming;

        this.filtered = [...this.allPurchasers];

        this.totalPages = data.totalPages;
        this.totalElements = data.totalElements;
        this.currentPage = data.number;

        // Your PageResponse model doesn't contain "last"
        this.isLastPage = data.number >= data.totalPages - 1;

        this.appState.setHasPurchasers(this.totalElements > 0);
        this.isLoading = false;
      },
      error: () => {
        this.alertService.error('Failed to load purchasers.');
        this.isLoading = false;
      }
    });
  }

  /* ---------- Search (reuse SearchBarComponent pattern) ---------- */
  handleTyping(event: any): void {
    const text =
      typeof event === 'string'
        ? event
        : (event?.target as HTMLInputElement)?.value ?? '';

    if (text.length > 1) {
      this.isSuggestionLoading = true;
      this.searchSubject.next(text);
    } else {
      this.suggestions = [];
      this.isSuggestionLoading = false; 
    }
  }

  private performSuggestionSearch(text: string): void {
    this.authService.searchPurchasers(this.userId, text).subscribe({
      next: (data: any[]) => {
        this.suggestions = data;
        this.isSuggestionLoading = false;
      },
      error: () => {
        this.suggestions = [];
        this.isSuggestionLoading = false;
      }
    });
  }

  handleSearch(eventData: any): void {
    this.currentPage = 0;

    if (typeof eventData === 'string') {
      this.searchText = eventData;
    } else {
      this.searchText = eventData?.name ?? '';
    }

    this.allPurchasers = [];
    this.load(0, false);
  }

  resetView(): void {
    this.searchText = '';
    this.suggestions = [];
    this.currentPage = 0;
    this.allPurchasers = [];
    this.load(0, false);
  }

  /* ---------- Pagination ---------- */

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.load(page, false);
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    let start = Math.max(0, this.currentPage - 1);
    let end   = Math.min(this.totalPages - 1, start + 2);
    if (end - start < 2) start = Math.max(0, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.scrollThrottleTimeout) return;
    this.scrollThrottleTimeout = setTimeout(() => {
      this.scrollThrottleTimeout = null;
      this.checkScrollPosition();
    }, 150);
  }

  private checkScrollPosition(): void {
    if (window.innerWidth < 768 && !this.isLastPage && !this.isLoading) {
      const pos = (document.documentElement.scrollTop || document.body.scrollTop)
                + document.documentElement.offsetHeight;
      if (pos > document.documentElement.scrollHeight - 100) {
        this.load(this.currentPage + 1, true);
      }
    }
  }

  /* ---------- Edit ---------- */

  openEdit(p: any): void {
    this.editingId = p.id;
    this.documentType = this.detectDocType(p.gstin);
    this.setGstinValidator(this.documentType);
    this.editForm.reset({
      name:  p.name,
      dl1:   p.dl1   === 'N/A' ? null : p.dl1,
      dl2:   p.dl2   === 'N/A' ? null : p.dl2,
      gstin: p.gstin === 'N/A' ? null : p.gstin
    });
    this.showModal = true;
  }

  changeDocType(type: 'GST' | 'PAN' | 'AADHAAR'): void {
    this.documentType = type;
    this.setGstinValidator(type);
  }

  setGstinValidator(type: 'GST' | 'PAN' | 'AADHAAR'): void {
    const ctrl = this.editForm.get('gstin');
    ctrl?.setValidators([Validators.pattern(PATTERNS[type])]);
    ctrl?.updateValueAndValidity();
  }

  saveEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.editForm.value;

    this.authService.savePurchaser({
      id:     this.editingId,
      userId: this.userId,
      name:   raw.name,
      dl1:    raw.dl1?.trim()   || 'N/A',
      dl2:    raw.dl2?.trim()   || 'N/A',
      gstin:  raw.gstin?.trim() || 'N/A'
    }).subscribe({
      next: (saved) => {
        const idx = this.allPurchasers.findIndex(p => p.id === this.editingId);
        if (idx !== -1) { this.allPurchasers[idx] = saved; this.filtered = [...this.allPurchasers]; }
        this.closeModal();
        this.alertService.success('Purchaser updated successfully.');
        this.saving = false;
      },
      error: () => { this.alertService.error('Failed to save changes.'); this.saving = false; }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.editForm.reset();
  }

  /* ---------- Delete ---------- */

  confirmDelete(p: any): void {
    this.alertService.confirm(
      `Are you sure you want to delete "${p.name}"? \nThis cannot be undone.`,
      () => this.deletePurchaser(p),
      'Delete Purchaser'
    );
  }

  deletePurchaser(p: any): void {
    this.authService.deletePurchaser(p.id).subscribe({
      next: () => {
        this.allPurchasers = this.allPurchasers.filter(x => x.id !== p.id);
        this.filtered = [...this.allPurchasers];
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.appState.setHasPurchasers(this.totalElements > 0);
        this.alertService.success(`"${p.name}" deleted.`);
      },
      error: () => this.alertService.error('Failed to delete purchaser.')
    });
  }

  /* ---------- View Bills ---------- */

  viewBills(p: any): void {
    this.router.navigate(['/user/bills'], {
      queryParams: { purchaserId: p.id, purchaserName: p.name }
    });
  }

  /* ---------- Helpers ---------- */

  detectDocType(gstin: string): 'GST' | 'PAN' | 'AADHAAR' {
    if (!gstin || gstin === 'N/A') return 'GST';
    if (/^[0-9]{12}$/.test(gstin))              return 'AADHAAR';
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(gstin)) return 'PAN';
    return 'GST';
  }

  getIdLabel(p: any): string {
    if (!p.gstin || p.gstin === 'N/A') return '';
    return this.detectDocType(p.gstin) === 'AADHAAR' ? 'Aadhaar'
         : this.detectDocType(p.gstin) === 'PAN'     ? 'PAN'
         : 'GSTIN';
  }

  get isSearchActive(): boolean {
    return this.searchText.trim().length > 0;
  }
}