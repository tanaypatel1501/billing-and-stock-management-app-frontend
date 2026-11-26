import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faHandHoldingDollar, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { CollapsibleHeaderDirective } from 'src/app/shared/collapsible-header/collapsible-header.directive';
import { AGE_BUCKETS, AgeFields, AgeKey, OutstandingCustomer, OutstandingReport } from 'src/app/models/outstanding.model';

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
  data: OutstandingReport | null = null;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    // "sales:" prefix: cleared whenever a bill is created or reverted or a payment changes
    const key = 'sales:outstanding';
    const cached = this.requestCache.get(key);
    if (cached) {
      this.data = cached;
      this.isLoading = false;
      return;
    }
    this.authService.getOutstandingReport().subscribe({
      next: (d: OutstandingReport) => {
        this.requestCache.set(key, d);
        this.data = d;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.alertService.error('Failed to load outstanding payments.');
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

  trackByCustomer(_: number, c: OutstandingCustomer): string {
    return c.purchaserId != null ? 'id:' + c.purchaserId : 'name:' + c.name;
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

  openCustomer(c: OutstandingCustomer): void {
    if (c.purchaserId != null) {
      this.router.navigate(['/user/bills'], {
        queryParams: { purchaserId: c.purchaserId, purchaserName: c.name, from: 'outstanding' }
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