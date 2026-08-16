import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-faq',
  standalone: true,
  imports: [CommonModule, DocCalloutComponent],
  template: `
    <h1>FAQ</h1>

    <h3>Why two backends per environment?</h3>
    <p>The always-on OCI VM avoids cold starts under normal load. The failover platform (Koyeb in prod,
    Render in dev) only gets traffic if the primary is unreachable or returns a 502+, via the Cloudflare
    Worker's health check.</p>

    <h3>Why is invoice PDF generation slower for bulk exports?</h3>
    <p>It isn't especially — bulk ZIP export fans PDF generation out across a bounded thread pool (4 workers)
    rather than one at a time, and each PDF still does its own font/logo resolution (logo is cached in-process
    for 30 minutes to reduce repeated S3 calls).</p>

    <h3>Why don't blank invoice rows just leave empty space?</h3>
    <p>Real invoicing software (QuickBooks, Zoho Books, Tally) renders blank ledger-style rows rather than one
    large blank region, so a 1-item and a 10-item invoice both read as "the same kind of document." GST Medicose
    follows the same convention.</p>

    <doc-callout type="info" title="Something missing?">
      This documentation is a living reference — if a page doesn't cover what you need, check the source
      repositories directly, or treat gaps here as a signal to expand this section.
    </doc-callout>
  `
})
export class FaqComponent {}