import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DocDiagramComponent } from '../../shared/doc-diagram/doc-diagram.component';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-architecture',
  standalone: true,
  imports: [CommonModule, DocDiagramComponent, DocCalloutComponent, RouterModule],
  template: `
    <h1>Architecture</h1>
    <p>GST Medicose is a two-tier system: an Angular single-page frontend talking to a Spring Boot REST backend, with a handful of supporting external services.</p>

    <doc-diagram [diagram]="archDiagram"></doc-diagram>

    <h2>Backend stack</h2>
    <ul>
      <li>Spring Boot 3.1.3, Java 17, Maven build</li>
      <li>Spring Data JPA / Hibernate ORM, MySQL driver</li>
      <li>Spring Security — stateless, JWT-based (see <a routerLink="/documentation/authentication">Authentication</a>)</li>
      <li>Thymeleaf templates rendered to PDF via Flying Saucer + OpenPDF</li>
      <li>AWS SDK v2 <code>S3Client</code> pointed at a Tebi (S3-compatible) bucket for logo storage</li>
      <li>ZXing-based QR code generation for UPI payment links</li>
      <li>Scheduled tasks (<code>@EnableScheduling</code>) for product-request housekeeping</li>
      <li>Docker-packaged, deployed via a repo-root <code>Dockerfile</code></li>
    </ul>

    <h2>Frontend stack</h2>
    <ul>
      <li>Angular, migrating toward standalone components</li>
      <li>FontAwesome icon set</li>
      <li>Custom <code>RequestCacheService</code> (TTL-based in-memory cache)</li>
      <li><code>DebouncedSearch</code> / <code>ScrollThrottle</code> shared utilities</li>
      <li><code>jwt-decode</code> for client-side token expiry inspection</li>
      <li>A single <code>AuthService</code> acting as the central HTTP API gateway for the whole app</li>
    </ul>

    <doc-callout type="info" title="Why one AuthService for everything?">
      Despite the name, <code>AuthService</code> covers auth, bills, stock, products, purchasers, sales,
      profile, OCR, and product requests. It's a pragmatic choice for an app this size — one place to look
      for any HTTP call — though a larger codebase would likely split this into per-domain services.
    </doc-callout>
  `
})
export class ArchitectureComponent {
  archDiagram = `
flowchart TB
    subgraph Client
        UI[Angular SPA]
    end
    subgraph Edge
        CFW[Cloudflare Worker]
    end
    subgraph Backend
        API[REST Controllers]
        SEC[JWT Filter Chain]
        SVC[Service Layer]
        JPA[Spring Data JPA]
        PDF[PDF Invoice Engine]
    end
    subgraph External
        S3[(Object Storage)]
        OCR[OCR Microservice]
        GOOGLE[Google Identity]
        DB[(MySQL)]
    end
    UI --> CFW --> API
    API --> SEC --> SVC
    SVC --> JPA --> DB
    SVC --> PDF
    SVC --> S3
    SVC --> OCR
    SEC --> GOOGLE
  `;
}