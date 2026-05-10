import { Component, Input } from '@angular/core';
import { InvoiceData } from 'src/app/models/invoice-data.model';

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
}