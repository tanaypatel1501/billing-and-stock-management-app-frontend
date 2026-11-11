import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTruck, faIdCard, faPencil, faXmark, faArrowLeft,
  faPlus, faPhone, faLocationDot
} from '@fortawesome/free-solid-svg-icons';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { AuthService, PageResponse } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { SearchBarComponent } from 'src/app/shared/search-bar/search-bar.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { SuppressDockDirective } from 'src/app/shared/suppress-dock/suppress-dock.directive';
import { DebouncedSearch } from 'src/app/shared/utils/debounced-search';
import { ScrollThrottle } from 'src/app/shared/utils/scroll-throttle';
import { Supplier } from 'src/app/models/purchase.model';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const DL_PATTERN = /^[A-Z0-9\-\/\s]{10,30}$/i;
const PHONE_PATTERN = /^[0-9]{10}$/;

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    SearchBarComponent,
    LoadingSpinnerComponent,
    SuppressDockDirective
  ],
  templateUrl: './suppliers.component.html',
  styleUrls: ['../purchasers/purchasers.component.scss', './suppliers.component.scss']
})
export class SuppliersComponent implements OnInit, OnDestroy {

  faTruck = faTruck; faIdCard = faIdCard; faPencil = faPencil;
  faTrashCan = faTrashCan; faXmark = faXmark; faArrowLeft = faArrowLeft;
  faPlus = faPlus; faPhone = faPhone; faLocationDot = faLocationDot;

  allSuppliers: Supplier[] = [];
  states: string[] = [];

  // search
  searchText = '';
  suggestions: Supplier[] = [];
  isSuggestionLoading = false;

  // pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 20;
  isLastPage = false;

  isLoading = true;

  // add / edit modal
  showModal = false;
  form!: FormGroup;
  editingId: number | null = null;
  saving = false;

  private debouncedSearch = new DebouncedSearch(text => this.performSuggestionSearch(text), 250);
  private scrollThrottle = new ScrollThrottle(() => this.checkScrollPosition(), 150);

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private fb: FormBuilder,
    private requestCache: RequestCacheService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.authService.getAllStates().subscribe({
      next: states => (this.states = states),
      error: () => (this.states = [])
    });
    this.load(0, false);
  }

  ngOnDestroy(): void {
    this.debouncedSearch.destroy();
    this.scrollThrottle.destroy();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      name:        [null, Validators.required],
      phoneNumber: [null, [Validators.pattern(PHONE_PATTERN)]],
      state:       [null],
      gstin:       [null, [Validators.pattern(GSTIN_PATTERN)]],
      dl1:         [null, [Validators.pattern(DL_PATTERN)]],
      dl2:         [null, [Validators.pattern(DL_PATTERN)]]
    });
  }

  /* ---------- Load ---------- */

  load(page: number = 0, append: boolean = false): void {
    this.isLoading = true;
    const params = { page, size: this.pageSize, searchText: this.searchText };
    const cacheKey = `suppliers:${JSON.stringify(params)}`;

    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.applyPage(cached, append);
      return;
    }

    this.authService.getSuppliersPage(params).subscribe({
      next: (data: PageResponse<Supplier>) => {
        this.requestCache.set(cacheKey, data);
        this.applyPage(data, append);
      },
      error: () => {
        this.alertService.error('Failed to load suppliers.');
        this.isLoading = false;
      }
    });
  }

  private applyPage(data: PageResponse<Supplier>, append: boolean): void {
    const incoming = data.content ?? [];
    this.allSuppliers = append ? [...this.allSuppliers, ...incoming] : incoming;
    this.totalPages = data.totalPages;
    this.totalElements = data.totalElements;
    this.currentPage = data.number;
    this.isLastPage = data.number >= data.totalPages - 1;
    this.isLoading = false;
  }

  /* ---------- Search ---------- */

  handleTyping(event: any): void {
    const text = typeof event === 'string' ? event : (event?.target as HTMLInputElement)?.value ?? '';
    if (text.length > 1) {
      this.isSuggestionLoading = true;
      this.debouncedSearch.next(text);
    } else {
      this.suggestions = [];
      this.isSuggestionLoading = false;
    }
  }

  private performSuggestionSearch(text: string): void {
    this.authService.searchSuppliers(text).subscribe({
      next: data => { this.suggestions = data; this.isSuggestionLoading = false; },
      error: () => { this.suggestions = []; this.isSuggestionLoading = false; }
    });
  }

  handleSearch(eventData: any): void {
    this.searchText = typeof eventData === 'string' ? eventData : (eventData?.name ?? '');
    this.allSuppliers = [];
    this.load(0, false);
  }

  resetView(): void {
    this.searchText = '';
    this.suggestions = [];
    this.allSuppliers = [];
    this.load(0, false);
  }

  get isSearchActive(): boolean {
    return this.searchText.trim().length > 0;
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
    let end = Math.min(this.totalPages - 1, start + 2);
    if (end - start < 2) start = Math.max(0, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.scrollThrottle.trigger();
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

  /* ---------- Add / edit ---------- */

  openAdd(): void {
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(s: Supplier): void {
    this.editingId = s.id ?? null;
    this.form.reset({
      name: s.name,
      phoneNumber: s.phoneNumber ?? null,
      state: s.state ?? null,
      gstin: s.gstin ?? null,
      dl1: s.dl1 ?? null,
      dl2: s.dl2 ?? null
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);

    const payload: Supplier = {
      id: this.editingId ?? undefined,
      name: raw.name.trim(),
      phoneNumber: clean(raw.phoneNumber),
      state: raw.state || null,
      gstin: clean(raw.gstin)?.toUpperCase() ?? null,
      dl1: clean(raw.dl1),
      dl2: clean(raw.dl2)
    };

    this.authService.saveSupplier(payload).subscribe({
      next: () => {
        this.alertService.success(this.editingId ? 'Supplier updated.' : 'Supplier saved.');
        this.requestCache.invalidate('suppliers:');
        this.saving = false;
        this.closeModal();
        this.load(this.currentPage, false);
      },
      error: (err) => {
        this.alertService.error(err?.error?.message || 'Failed to save supplier.');
        this.saving = false;
      }
    });
  }

  /* ---------- Delete ---------- */

  confirmDelete(s: Supplier): void {
    this.alertService.confirm(
      `Are you sure you want to delete "${s.name}"? \nYour past purchases from this supplier are kept.`,
      () => this.deleteSupplier(s),
      'Delete Supplier'
    );
  }

  private deleteSupplier(s: Supplier): void {
    this.authService.deleteSupplier(s.id!).subscribe({
      next: () => {
        this.allSuppliers = this.allSuppliers.filter(x => x.id !== s.id);
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.alertService.success(`"${s.name}" deleted.`);
        this.requestCache.invalidate('suppliers:');
      },
      error: () => this.alertService.error('Failed to delete supplier.')
    });
  }
}