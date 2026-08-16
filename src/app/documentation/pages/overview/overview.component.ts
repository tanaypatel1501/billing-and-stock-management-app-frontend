import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-overview',
  standalone: true,
  imports: [CommonModule, DocCalloutComponent],
  template: `
    <h1>Overview</h1>
    <p>GST Medicose is a full-stack billing and inventory management system built for pharmacy and medical-store businesses.</p>

    <h2>What it does</h2>
    <ul>
      <li>Batch/expiry-aware stock and product inventory</li>
      <li>GST-compliant invoicing (CGST/SGST or IGST modes)</li>
      <li>PDF invoice generation with UPI QR codes and tax breakdowns</li>
      <li>Camera-based label scanning via an OCR microservice</li>
      <li>Google Sign-In and email/password authentication</li>
      <li>Bulk invoice export as a single ZIP</li>
    </ul>

    <doc-callout type="info" title="Two environments, four deployed surfaces">
      Development and Production each run an independently deployed frontend and backend.
      See <a routerLink="/documentation/hosting">Hosting &amp; Failover</a> for the full topology.
    </doc-callout>
  `
})
export class OverviewComponent {}