import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faFileInvoiceDollar, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { CollapsibleHeaderDirective } from 'src/app/shared/collapsible-header/collapsible-header.directive';
import { GstMonth, GstSummary, financialYearLabel, financialYearOf } from 'src/app/models/gst-summary.model';

function currentFinancialYear(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-gst-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, LoadingSpinnerComponent, CollapsibleHeaderDirective],
  templateUrl: './gst-summary.component.html',
  styleUrls: ['../bills/bills.component.scss', './gst-summary.component.scss']
})
export class GstSummaryComponent implements OnInit {

  faArrowLeft = faArrowLeft;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faCircleInfo = faCircleInfo;

  data: GstSummary | null = null;
  selectedFy: number = currentFinancialYear();
  fyOptions: { value: number; label: string }[] = [];
  isLoading = true;

  private readonly thisMonth = currentYearMonth();

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private requestCache: RequestCacheService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load(this.selectedFy);
  }

  /* ---------- Load ---------- */

  load(fy: number): void {
    this.isLoading = true;
    const key = `sales:gst:${fy}`;
    const cached = this.requestCache.get(key);
    if (cached) {
      this.apply(cached);
      return;
    }
    this.authService.getGstSummary(fy).subscribe({
      next: (d: GstSummary) => {
        this.requestCache.set(key, d);
        this.apply(d);
      },
      error: () => {
        this.isLoading = false;
        this.alertService.error('Failed to load the GST summary.');
      }
    });
  }

  private apply(d: GstSummary): void {
    this.data = d;
    this.buildFyOptions(d);
    this.isLoading = false;
  }

  onFyChange(fy: number): void {
    if (fy === this.selectedFy) return;
    this.selectedFy = fy;
    this.load(fy);
  }

  /** Financial years from the first bill or purchase up to the current one, newest first. */
  private buildFyOptions(d: GstSummary): void {
    const current = currentFinancialYear();
    const starts = [d.firstBillDate, d.firstPurchaseDate]
      .filter((x): x is string => !!x)
      .map(financialYearOf);
    const first = starts.length ? Math.min(...starts, current) : current;

    const options: { value: number; label: string }[] = [];
    for (let fy = current; fy >= first; fy--) {
      options.push({ value: fy, label: financialYearLabel(fy) });
    }
    if (!options.some(o => o.value === this.selectedFy)) {
      options.push({ value: this.selectedFy, label: financialYearLabel(this.selectedFy) });
    }
    this.fyOptions = options;
  }

  /* ---------- Helpers used by the template ---------- */

  monthLabel(ym: string): string {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  }

  isFuture(m: GstMonth): boolean {
    return m.month > this.thisMonth;
  }

  isCredit(m: GstMonth): boolean {
    return (m.netGst ?? 0) < 0;
  }

  absNet(m: GstMonth): number {
    return Math.abs(m.netGst ?? 0);
  }

  firstPurchaseMonth(d: GstSummary): string {
    return d.firstPurchaseDate ? d.firstPurchaseDate.substring(0, 7) : '';
  }

  /** Show the "input GST starts in <month>" note when some past months in this year have no purchase records. */
  showPartialBanner(d: GstSummary): boolean {
    if (!d.firstPurchaseDate) return false;
    const someUntracked = d.months.some(m => !m.inputTracked && !this.isFuture(m));
    return someUntracked || this.firstMonthInFy(d);
  }

  firstMonthInFy(d: GstSummary): boolean {
    const fm = this.firstPurchaseMonth(d);
    return !!fm && fm >= d.months[0].month && fm <= d.months[d.months.length - 1].month;
  }

  /* ---------- Navigation ---------- */

  goBack(): void {
    this.router.navigate(['/user/sales']);
  }

  goToPurchase(): void {
    this.router.navigate(['/user/create-purchase']);
  }
}