import { Component, Input } from '@angular/core';
import { InvoiceData } from 'src/app/models/invoice-data.model';

@Component({
  selector: 'app-invoice-template-one',
  templateUrl: './invoice-template-one.component.html',
  styleUrls: ['./invoice-template-one.component.scss'],
  standalone: false
})
export class InvoiceTemplateOneComponent {
  @Input() data!: InvoiceData;

  getIdentificationLabel(value: string): string {
    if (!value) return 'GSTIN';
    if (/^[0-9]{12}$/.test(value)) return 'Aadhaar';
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value)) return 'PAN';
    return 'GSTIN';
  }
}