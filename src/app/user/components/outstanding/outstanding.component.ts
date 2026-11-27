import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faHandHoldingDollar, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { CollapsibleHeaderDirective } from 'src/app/shared/collapsible-header/collapsible-header.directive';
import { AGE_BUCKETS, AgeFields, AgeKey, OutstandingCustomer, OutstandingReport } from 'src/app/models/outstanding.model';

type ReportMode = 'receivables' | 'payables';

interface ModeLabels {
  subtitle: string;
  totalLabel: string;
  itemOne: string;
  itemMany: string;
  itemHeader: string;
  partyOne: string;
  partyMany: string;
  partyHeader: string;
  oldestLabel: string;
  emptyTitle: string;
  emptyText: string;
  tapHint: string;
}

const LABELS: Record<ReportMode, ModeLabels> = {
  receivables: {
    subtitle: 'Money still to collect, by customer and age',
    totalLabel: 'Total to collect',
    itemOne: 'bill',
    itemMany: 'bills',
    itemHeader: 'Bills',
    partyOne: 'customer',
    partyMany: 'customers',
    partyHeader: 'Customer',
    oldestLabel: 'Oldest unpaid bill',
    emptyTitle: 'Nothing outstanding',
    emptyText: 'Every bill is fully paid.',
    tapHint: 'Tap a customer to see their bills and record payments.'
  },
  payables: {
    subtitle: 'Money you still owe suppliers, by supplier and age',
    totalLabel: 'Total to pay',
    itemOne: 'purchase',
    itemMany: 'purchases',
    itemHeader: 'Purchases',
    partyOne: 'supplier',
    partyMany: 'suppliers',
    partyHeader: 'Supplier',
    oldestLabel: 'Oldest unpaid purchase',
    emptyTitle: 'Nothing to pay',
    emptyText: 'Every purchase is fully paid.',
    tapHint: 'Tap a supplier to see their purchases and record payments.'
  }
};

@Component({
  selector: 'app-outstanding',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, LoadingSpinnerComponent, CollapsibleHeaderDirective],
  templateUrl: './outstanding.component.html',
  styleUrls: ['../bills/bills.component.scss', './outstanding.component.scss']
})
export class OutstandingComponent implements OnInit {

  faArrowLeft = faArrowLeft;
  faHandHoldingDollar = faHandHoldingDollar;
  faCircleInfo = faCircleInfo;

  buckets = AGE_BUCKETS;
  mode: ReportMode = 'receivables';

  private reports: Partial<Record<ReportMode, OutstandingReport>> = {};
  private loading: Partial<Record<ReportMode, boolean>> = {};
  private failed: Partial<Record<ReportMode, boolean>> = {};

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.queryParamMap.get('tab') === 'payables' ? 'payables' : 'receivables';
    this.load(this.mode);
  }

  get data(): OutstandingReport | null { return this.reports[this.mode] ?? null; }
  get isLoading(): boolean { return !!this.loading[this.mode] && !this.data; }
  get hasFailed(): boolean { return !!this.failed[this.mode] && !this.data; }
  get L(): ModeLabels { return LABELS[this.mode]; }

  setMode(m: ReportMode): void {
    if (m === this.mode) return;
    this.mode = m;
    // keep the tab in the URL, so a refresh or the browser back button returns to the same tab
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: m === 'payables' ? 'payables' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    if (!this.reports[m]) {
      this.load(m);
    }
  }

  load(mode: ReportMode): void {
    // "sales:" is cleared when bills or their payments change, "purchases:" when purchases or their payments change
    const key = mode === 'payables' ? 'purchases:payables' : 'sales:outstanding';
    const cached = this.requestCache.get(key);
    if (cached) {
      this.reports[mode] = cached;
      return;
    }
    this.loading[mode] = true;
    this.failed[mode] = false;
    const request = mode === 'payables'
      ? this.authService.getPayablesReport()
      : this.authService.getOutstandingReport();
    request.subscribe({
      next: (d: OutstandingReport) => {
        this.requestCache.set(key, d);
        this.reports[mode] = d;
        this.loading[mode] = false;
      },
      error: () => {
        this.loading[mode] = false;
        this.failed[mode] = true;
        this.alertService.error('Failed to load the report.');
      }
    });
  }

  value(src: AgeFields, key: AgeKey): number {
    return src[key];
  }

  /** Share of one age bucket within the bucket total of the same row, in percent. */
  pct(src: AgeFields, key: AgeKey): number {
    const total = src.age0to30 + src.age31to60 + src.age61to90 + src.ageOver90;
    return total > 0 ? (src[key] / total) * 100 : 0;
  }

  over60(d: OutstandingReport): number {
    return d.age61to90 + d.ageOver90;
  }

  over60Percent(d: OutstandingReport): number {
    return d.totalOutstanding > 0 ? (this.over60(d) / d.totalOutstanding) * 100 : 0;
  }

  private oldest(d: OutstandingReport): OutstandingCustomer | null {
    let best: OutstandingCustomer | null = null;
    for (const c of d.customers) {
      if (c.oldestAgeDays != null && (best === null || c.oldestAgeDays > (best.oldestAgeDays ?? -1))) {
        best = c;
      }
    }
    return best;
  }

  oldestDays(d: OutstandingReport): number {
    return this.oldest(d)?.oldestAgeDays ?? 0;
  }

  oldestName(d: OutstandingReport): string {
    return this.oldest(d)?.name ?? '';
  }

  trackByCustomer(_: number, c: OutstandingCustomer): string {
    return c.partyId != null ? 'id:' + c.partyId : 'name:' + c.name;
  }

  openCustomer(c: OutstandingCustomer): void {
    if (this.mode === 'payables') {
      // Purchases are searched by supplier name
      this.router.navigate(['/user/purchases'], {
        queryParams: { searchText: c.name, from: 'outstanding-payables' }
      });
      return;
    }
    if (c.partyId != null) {
      this.router.navigate(['/user/bills'], {
        queryParams: { purchaserId: c.partyId, purchaserName: c.name, from: 'outstanding' }
      });
    } else {
      this.router.navigate(['/user/bills'], {
        queryParams: { searchText: c.name, from: 'outstanding' }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/user/sales']);
  }
}