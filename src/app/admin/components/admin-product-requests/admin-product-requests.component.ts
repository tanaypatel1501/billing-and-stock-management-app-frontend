import { Component, OnInit } from '@angular/core';
import { AuthService, ProductRequestDTO } from 'src/app/services/auth-service/auth.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';

type FilterType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

@Component({
  selector: 'app-admin-product-requests',
  templateUrl: './admin-product-requests.component.html',
  styleUrls: ['./admin-product-requests.component.scss']
})
export class AdminProductRequestsComponent implements OnInit {
  allRequests: ProductRequestDTO[] = [];
  filteredRequests: ProductRequestDTO[] = [];
  activeFilter: FilterType = 'PENDING';
  isLoading = false;
  expandedId: number | null = null;
  processingId: number | null = null;
  adminNotes: { [key: number]: string } = {};

  get pendingCount(): number {
    return this.allRequests.filter(r => r.status === 'PENDING').length;
  }

  constructor(
    private authService: AuthService,
    private requestCache: RequestCacheService  
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    const cacheKey = 'productRequests:all';
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      this.allRequests = cached;
      this.applyFilter();
      this.isLoading = false;
      return;
    }

    this.authService.getAllProductRequests().subscribe({
      next: (data) => {
        this.requestCache.set(cacheKey, data);
        this.allRequests = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  setFilter(filter: FilterType): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredRequests = this.activeFilter === 'ALL'
      ? [...this.allRequests]
      : this.allRequests.filter(r => r.status === this.activeFilter);
  }

  toggleExpand(id: number | undefined): void {
    if (id === undefined) return;
    this.expandedId = this.expandedId === id ? null : id;
  }

  approve(req: ProductRequestDTO): void {
    if (!req.id) return;
    this.processingId = req.id;
    const note = this.adminNotes[req.id] || '';
    this.authService.approveProductRequest(req.id, note).subscribe({
      next: (updated) => {
        this.updateLocalRequest(updated);
        this.requestCache.invalidateMany(['productRequests:', 'products:']);
        this.processingId = null;
        this.expandedId = null;
      },
      error: () => {
        this.processingId = null;
      }
    });
  }

  reject(req: ProductRequestDTO): void {
    if (!req.id) return;
    const note = this.adminNotes[req.id] || '';
    if (!note.trim()) {
      const confirmed = confirm('No rejection reason entered. Reject anyway?');
      if (!confirmed) return;
    }
    this.processingId = req.id;
    this.authService.rejectProductRequest(req.id, note).subscribe({
      next: (updated) => {
        this.updateLocalRequest(updated);
        this.requestCache.invalidate('productRequests:');  
        this.processingId = null;
        this.expandedId = null;
      },
      error: () => {
        this.processingId = null;
      }
    });
  }

  private updateLocalRequest(updated: ProductRequestDTO): void {
    const idx = this.allRequests.findIndex(r => r.id === updated.id);
    if (idx !== -1) {
      this.allRequests[idx] = updated;
    }
    this.applyFilter();
  }
}