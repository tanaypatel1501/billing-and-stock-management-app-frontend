import { Component, OnInit } from '@angular/core';
import { AuthService, ProductRequestDTO } from 'src/app/services/auth-service/auth.service';

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

  // Map of requestId → admin note string
  adminNotes: { [key: number]: string } = {};

  get pendingCount(): number {
    return this.allRequests.filter(r => r.status === 'PENDING').length;
  }

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.authService.getAllProductRequests().subscribe({
      next: (data) => {
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
    if (this.activeFilter === 'ALL') {
      this.filteredRequests = [...this.allRequests];
    } else {
      this.filteredRequests = this.allRequests.filter(r => r.status === this.activeFilter);
    }
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
      // Nudge admin to add a reason — good UX for the user getting the rejection email
      const confirmed = confirm('No rejection reason entered. Reject anyway?');
      if (!confirmed) return;
    }
    this.processingId = req.id;

    this.authService.rejectProductRequest(req.id, note).subscribe({
      next: (updated) => {
        this.updateLocalRequest(updated);
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