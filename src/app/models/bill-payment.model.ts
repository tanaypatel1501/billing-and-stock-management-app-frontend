export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER';
export type BillPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' }
];

export function paymentModeLabel(mode: string | null | undefined): string {
  return PAYMENT_MODES.find(m => m.value === mode)?.label ?? (mode || '');
}

export interface BillPayment {
  id: number;
  billId: number;
  amount: number;
  paymentDate: string;          // yyyy-MM-dd
  mode: PaymentMode;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface BillBalance {
  billId: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillPaymentStatus;
  payments: BillPayment[] | null;   // null in the batch (list) response
}

export interface BillPaymentRequest {
  amount: number;
  paymentDate?: string;
  mode?: PaymentMode;
  reference?: string;
  notes?: string;
}