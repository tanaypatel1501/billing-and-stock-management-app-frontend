import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-frontend',
  standalone: true,
  imports: [CommonModule, DocCalloutComponent],
  template: `
    <h1>Frontend Architecture</h1>

    <h2>Caching</h2>
    <p><code>RequestCacheService</code> provides a lightweight TTL cache keyed by request shape
    (e.g. <code>bills:{{'{'}}userId{{'}'}}:{{'{'}}JSON.stringify(searchRequest){{'}'}}</code>), invalidated
    selectively on mutations rather than cleared wholesale.</p>

    <h2>List UX</h2>
    <p>Desktop uses numbered pagination; mobile uses infinite scroll via a throttled scroll listener
    (<code>ScrollThrottle</code>), both backed by the same paginated search endpoint.</p>

    <h2>Search-as-you-type</h2>
    <p><code>DebouncedSearch</code> (250ms) wraps suggestion queries so keystrokes don't each trigger a network call.</p>

    <h2>Bulk selection & export</h2>
    <p>A single-click "select all across all pages" pattern re-queries the backend with
    <code>size = totalElements</code> to gather every matching ID, then chooses between the single-PDF
    endpoint (exactly one bill) and the ZIP endpoint (more than one).</p>

    <doc-callout type="info" title="Token lifecycle">
      The JWT is decoded client-side (<code>jwt-decode</code>) purely to read <code>exp</code> and schedule
      a refresh — the signature is never validated client-side, correctly left to the server.
    </doc-callout>
  `
})
export class FrontendComponent {}