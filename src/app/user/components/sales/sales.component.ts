import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { faChartBar, faToggleOn, faToggleOff, faArrowTrendUp } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, FormsModule],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent implements OnInit {

  faChartBar = faChartBar;
  faToggleOn = faToggleOn;
  faToggleOff = faToggleOff;
  faArrowTrendUp = faArrowTrendUp;

  userId: any;
  isLoading = true;
  paidOnly = false;

  summary: any = null;
  topProducts: any[] = [];
  monthlySales: any[] = [];
  yearlySales: any[] = [];
  availableYears: number[] = [];
  selectedYear: number = new Date().getFullYear();
  totalBillsOverall: number = 0;

  // Chart dimensions
  readonly BAR_HEIGHT = 32;
  readonly BAR_GAP = 12;
  readonly CHART_PADDING = 40;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.loadYears();
  }

  loadYears(): void {
    this.authService.getAvailableYears(this.userId).subscribe({
      next: (years: number[]) => {
        this.availableYears = years;
        if (years.length > 0 && !years.includes(this.selectedYear)) {
          this.selectedYear = years[0];
        }
        this.loadAll();
      },
      error: () => this.loadAll()
    });
  }

  loadAll(): void {
    this.isLoading = true;
    let completed = 0;
    const done = () => { if (++completed === 4) this.isLoading = false; };

    this.authService.getSalesSummary(this.userId, false).subscribe({
      next: (data: any) => { this.totalBillsOverall = data?.totalBills ?? 0; },
      error: () => { this.totalBillsOverall = 0; }
    });
    
    this.authService.getSalesSummary(this.userId, this.paidOnly).subscribe({
      next: (data: any) => { this.summary = data; done(); },
      error: () => done()
    });

    this.authService.getTopProducts(this.userId, this.paidOnly, 6).subscribe({
      next: (data: any[]) => { this.topProducts = data; done(); },
      error: () => done()
    });

    this.authService.getMonthlySales(this.userId, this.selectedYear, this.paidOnly).subscribe({
      next: (data: any[]) => { this.monthlySales = this.fillMonths(data); done(); },
      error: () => done()
    });

    this.authService.getYearlySales(this.userId, this.paidOnly).subscribe({
      next: (data: any[]) => { this.yearlySales = data; done(); },
      error: () => done()
    });
  }

  onTogglePaid(): void {
    this.paidOnly = !this.paidOnly;
    this.loadAll();
  }

  onYearChange(): void {
    this.isLoading = true;
    this.authService.getMonthlySales(this.userId, this.selectedYear, this.paidOnly).subscribe({
      next: (data: any[]) => { this.monthlySales = this.fillMonths(data); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  // Fill missing months with zero so chart always shows all 12 bars
  fillMonths(data: any[]): any[] {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return monthNames.map((name, i) => {
      const found = data.find(d => d.month === i + 1);
      return { month: i + 1, monthName: name, totalRevenue: found?.totalRevenue ?? 0, totalUnitsSold: found?.totalUnitsSold ?? 0 };
    });
  }

  // Chart helpers — horizontal bar chart, value → percentage width
  maxTopProductQty(): number {
    return Math.max(...this.topProducts.map(p => p.totalQuantitySold), 1);
  }

  maxMonthlyRevenue(): number {
    return Math.max(...this.monthlySales.map(m => m.totalRevenue), 1);
  }

  maxYearlyRevenue(): number {
    return Math.max(...this.yearlySales.map(y => y.totalRevenue), 1);
  }

  barWidth(value: number, max: number): number {
    return Math.round((value / max) * 100);
  }

  monthChartHeight(): number {
    return 12 * (this.BAR_HEIGHT + this.BAR_GAP) + this.CHART_PADDING;
  }

  formatCurrency(val: number): string {
    if (!val) return '₹0';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + val.toFixed(0);
  }
}