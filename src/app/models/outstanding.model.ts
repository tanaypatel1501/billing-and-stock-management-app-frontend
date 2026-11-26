export type AgeKey = 'age0to30' | 'age31to60' | 'age61to90' | 'ageOver90';

export interface AgeFields {
  age0to30: number;
  age31to60: number;
  age61to90: number;
  ageOver90: number;
}

export const AGE_BUCKETS: { key: AgeKey; label: string; cls: string }[] = [
  { key: 'age0to30', label: '0–30 days', cls: 'b0' },
  { key: 'age31to60', label: '31–60 days', cls: 'b1' },
  { key: 'age61to90', label: '61–90 days', cls: 'b2' },
  { key: 'ageOver90', label: 'Over 90 days', cls: 'b3' }
];

export interface OutstandingCustomer extends AgeFields {
  purchaserId: number | null;      // null when the bills are not linked to a saved customer
  name: string;
  billCount: number;
  outstanding: number;
  oldestInvoiceDate: string | null;
  oldestAgeDays: number | null;
}

export interface OutstandingReport extends AgeFields {
  asOf: string;                    // yyyy-MM-dd
  openBills: number;
  customerCount: number;
  totalOutstanding: number;
  customers: OutstandingCustomer[];
}