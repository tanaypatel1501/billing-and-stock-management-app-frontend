export interface GstMonth {
  month: string;                  // "2026-04", or "TOTAL"
  salesTaxable: number;           // sales value excluding GST
  salesGst: number;               // GST collected on sales (one total)
  inputCgst: number | null;       // null when no purchases were recorded for this month
  inputSgst: number | null;
  inputIgst: number | null;
  inputGst: number | null;
  netGst: number | null;          // salesGst - inputGst; negative means credit
  inputTracked: boolean;
}

export interface GstSummary {
  fyStartYear: number;
  fromDate: string;
  toDate: string;
  firstBillDate: string | null;
  firstPurchaseDate: string | null;
  months: GstMonth[];
  totals: GstMonth;
  trackedMonths: number;
}

/** Start year of the Indian financial year (April to March) that a yyyy-MM-dd date falls in. */
export function financialYearOf(date: string): number {
  const [year, month] = date.split('-').map(Number);
  return month >= 4 ? year : year - 1;
}

export function financialYearLabel(startYear: number): string {
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}