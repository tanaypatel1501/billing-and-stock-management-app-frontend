import { BillPaymentStatus, PaymentMode } from './bill-payment.model';

export interface PurchasePayment {
  id: number;
  purchaseId: number;
  amount: number;
  paymentDate: string;          // yyyy-MM-dd
  mode: PaymentMode;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseBalance {
  purchaseId: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillPaymentStatus;
  payments: PurchasePayment[] | null;
}

// Request for a payment. On a new purchase ("initialPayment") the amount is left out: it means the full total.
export interface PurchasePaymentRequest {
  amount?: number;
  paymentDate?: string;
  mode?: PaymentMode;
  reference?: string;
  notes?: string;
}