import { Component, Input } from '@angular/core';
import { InvoiceData } from 'src/app/models/invoice-data.model';

interface BillItem {
  rate: number;
  quantity: number;
  free?: number;
  snapshotCgst?: number;
  snapshotSgst?: number;
}

interface Bill {
  billItems?: BillItem[];
}

@Component({
  selector: 'app-invoice-template-two',
  templateUrl: './invoice-template-two.component.html',
  styleUrls: ['./invoice-template-two.component.scss'],
  standalone: false
})


export class InvoiceTemplateTwoComponent {
  @Input() data!: InvoiceData;

  getIdentificationLabel(value: string): string {
    if (!value) return 'GSTIN';
    if (/^[0-9]{12}$/.test(value)) return 'Aadhaar';
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value)) return 'PAN';
    return 'GSTIN';
  }

  get subtotal(): number {
    return (this.data.bill.billItems || []).reduce((sum: number, item: BillItem) => sum + item.rate * item.quantity, 0);
  }

  get discountAmount(): number {
    return (this.data.bill.billItems || []).reduce((sum: number, item: BillItem) => sum + (item.free || 0) * item.rate, 0);
  }

  get cgstTotal(): number {
    return (this.data.bill.billItems || []).reduce((sum: number, item: BillItem) => sum + (item.rate * item.quantity * (item.snapshotCgst || 0)) / 100, 0);
  }

  get sgstTotal(): number {
    return (this.data.bill.billItems || []).reduce((sum: number, item: BillItem) => sum + (item.rate * item.quantity * (item.snapshotSgst || 0)) / 100, 0);
  }

  get igstTotal(): number {
    return this.cgstTotal + this.sgstTotal;
  }
}