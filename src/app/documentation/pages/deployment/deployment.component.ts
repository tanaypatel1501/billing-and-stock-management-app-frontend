import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DocDiagramComponent } from '../../shared/doc-diagram/doc-diagram.component';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-deployment',
  standalone: true,
  imports: [CommonModule, DocDiagramComponent, DocCalloutComponent, RouterModule],
  template: `
    <h1>CI/CD Pipeline</h1>
    <p>GitHub Actions workflows under <code>.github/workflows/</code> build and deploy on push to <code>master</code>.</p>

    <doc-diagram [diagram]="pipelineDiagram"></doc-diagram>

    <doc-callout type="warning" title="Confirm against source">
      Exact workflow steps/triggers should be verified directly against the workflow YAML files rather than
      assumed from this diagram — it reflects the general shape of a Docker + OCI VM + Koyeb/Render deployment,
      not a line-by-line read of the pipeline.
    </doc-callout>

    <h2>See also</h2>
    <p>For the environment matrix and Cloudflare Worker failover logic, see
    <a routerLink="/documentation/hosting">Hosting & Failover</a>.</p>
  `
})
export class DeploymentComponent {
  pipelineDiagram = `
flowchart LR
    Push[Push to master] --> Build[Build & Test]
    Build --> Docker[Build Docker Image]
    Docker --> Deploy1[Deploy to OCI VM]
    Docker --> Deploy2[Trigger failover redeploy]
    Deploy1 --> Live1[Primary live]
    Deploy2 --> Live2[Failover live]
  `;
}