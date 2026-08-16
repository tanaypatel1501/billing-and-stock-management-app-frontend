import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocDiagramComponent } from '../../shared/doc-diagram/doc-diagram.component';
import { DocCodeBlockComponent } from '../../shared/doc-code-block/doc-code-block.component';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-hosting',
  standalone: true,
  imports: [CommonModule, DocDiagramComponent, DocCodeBlockComponent, DocCalloutComponent],
  template: `
    <h1>Hosting &amp; Failover</h1>
    <p>Both environments front their backend with a Cloudflare Worker that always tries the always-on primary VM first, falling back to a serverless platform only on failure.</p>

    <doc-diagram [diagram]="hostingDiagram"></doc-diagram>

    <h2>Environment matrix</h2>
    <table class="doc-table">
      <thead><tr><th>Component</th><th>Development</th><th>Production</th></tr></thead>
      <tbody>
        <tr><td>Frontend</td><td>Render (dev)</td><td>Render (prod)</td></tr>
        <tr><td>Backend — primary</td><td>OCI ARM VM</td><td>OCI ARM VM</td></tr>
        <tr><td>Backend — failover</td><td>Render</td><td>Koyeb</td></tr>
        <tr><td>Database</td><td>Self-hosted MySQL (OCI AMD VM)</td><td>Managed MySQL</td></tr>
      </tbody>
    </table>

    <h2>Edge router pattern</h2>
    <p>Illustrative shape of the routing logic — actual origin hostnames are intentionally omitted from this public page.</p>
    <doc-code-block language="typescript" [code]="workerCode"></doc-code-block>

    <doc-callout type="danger" title="Real origin URLs are not published here">
      This page describes the failover <em>pattern</em>, not the live configuration. Actual origin
      hostnames/URLs are kept out of public documentation, since publishing them would let anyone bypass
      the edge layer and hit the origin servers directly.
    </doc-callout>

    <doc-callout type="warning" title="Origin transport">
      The primary origin is reached over plain HTTP behind the edge router (the client only ever sees HTTPS).
      Acceptable at current scale; worth revisiting if data sensitivity or audience grows.
    </doc-callout>
  `
})
export class HostingComponent {
  hostingDiagram = `
flowchart TB
    UI[Angular SPA] -->|HTTPS| CFW[Cloudflare Worker]
    CFW -->|primary| OCI[Primary VM]
    CFW -.->|fallback| KOY[Failover Platform]
    OCI --> DB[(MySQL)]
    KOY --> DB
  `;

  workerCode = `const PRIMARY_URL = "<primary-origin>";   // e.g. always-on VM behind DDNS
const FAILOVER_URL = "<failover-origin>"; // e.g. Koyeb / Render

export default {
  async fetch(request, env, ctx) {
    try {
      const res = await fetch(PRIMARY_URL + new URL(request.url).pathname, {
        method: request.method, headers: request.headers,
        signal: AbortSignal.timeout(30000)
      });
      if (res.status < 502) return res;
      throw new Error("primary unhealthy");
    } catch {
      return fetch(FAILOVER_URL + new URL(request.url).pathname, { method: request.method });
    }
  }
};`;
}