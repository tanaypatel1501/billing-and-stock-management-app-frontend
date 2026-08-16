import { Routes } from '@angular/router';
import { DocumentationShellComponent } from './shell/documentation-shell.component';
import { NoauthGuard } from '../guards/noAuth/noauth.guard';

export const DOCUMENTATION_ROUTES: Routes = [
  {
    path: '',
    component: DocumentationShellComponent,
    canActivate: [NoauthGuard],
    title: 'Documentation | GST Medicose',
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },

      {
        path: 'overview',
        title: 'Overview | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/overview/overview.component').then(m => m.OverviewComponent)
      },
      {
        path: 'architecture',
        title: 'Architecture | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/architecture/architecture.component').then(m => m.ArchitectureComponent)
      },
      {
        path: 'hosting',
        title: 'Hosting | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/hosting/hosting.component').then(m => m.HostingComponent)
      },
      {
        path: 'deployment',
        title: 'Deployment | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/deployment/deployment.component').then(m => m.DeploymentComponent)
      },
      {
        path: 'authentication',
        title: 'Authentication | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/authentication/authentication.component').then(m => m.AuthenticationComponent)
      },
      {
        path: 'database',
        title: 'Database | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/database/database.component').then(m => m.DatabaseComponent)
      },
      {
        path: 'api-reference',
        title: 'API Reference | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/api-reference/api-reference.component').then(m => m.ApiReferenceComponent)
      },
      {
        path: 'frontend',
        title: 'Frontend | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/frontend/frontend.component').then(m => m.FrontendComponent)
      },
      {
        path: 'faq',
        title: 'FAQ | Documentation | GST Medicose',
        loadComponent: () =>
          import('./pages/faq/faq.component').then(m => m.FaqComponent)
      }
    ]
  }
];