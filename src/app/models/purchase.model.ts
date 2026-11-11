export type TaxMode = 'CGST_SGST' | 'IGST';

export interface Supplier {
  id?: number;
  userId?: number;
  name: string;
  dl1?: string | null;
  dl2?: string | null;
  gstin?: string | null;
  state?: string | null;
  phoneNumber?: string | null;
}

export interface PurchaseItem {
  id?: number;
  purchaseId?: number;
  productId: number;
  stockId?: number | null;
  snapshotProductName?: string;
  snapshotPacking?: string;
  snapshotHsn?: string;
  snapshotCgst?: number | null;
  snapshotSgst?: number | null;
  batchNo: string;
  expiryDate: string;            // yyyy-MM-dd
  mrp?: number | null;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  discountPercent: number;
  amount?: number;               // computed by the server
}

export interface Purchase {
  id?: number;
  supplierId: number | null;
  supplierName?: string;
  supplierGstin?: string | null;
  supplierInvoiceNo: string;
  invoiceDate: string;           // yyyy-MM-dd
  taxMode: TaxMode;
  purchaseItems?: PurchaseItem[];
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount?: number;
  reverted?: boolean;
  createdAt?: string;
}

/* ---------- Calculation helpers (same rules as the backend, used for the live preview) ---------- */

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** quantity x rate, less discount. Free units are not charged. */
export function lineAmount(quantity: number, rate: number, discountPercent: number): number {
  return round2((quantity || 0) * (rate || 0) * (1 - (discountPercent || 0) / 100));
}

export interface PurchaseTotals {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function calcTotals(
  lines: { amount: number; cgst: number; sgst: number }[],
  taxMode: TaxMode
): PurchaseTotals {
  let taxable = 0, cgst = 0, sgst = 0, igst = 0;
  for (const l of lines) {
    taxable += l.amount;
    if (taxMode === 'IGST') {
      igst += l.amount * (l.cgst + l.sgst) / 100;
    } else {
      cgst += l.amount * l.cgst / 100;
      sgst += l.amount * l.sgst / 100;
    }
  }
  const t = round2(taxable), c = round2(cgst), s = round2(sgst), i = round2(igst);
  return { taxable: t, cgst: c, sgst: s, igst: i, total: round2(t + c + s + i) };
}