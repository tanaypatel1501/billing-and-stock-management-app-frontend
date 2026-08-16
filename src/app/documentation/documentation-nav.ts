export interface DocNavItem { slug: string; title: string; }
export interface DocNavSection { section: string; items: DocNavItem[]; }

export const DOCUMENTATION_NAV: DocNavSection[] = [
  { section: 'Getting Started', items: [
    { slug: 'overview', title: 'Overview' },
    { slug: 'architecture', title: 'Architecture' },
  ]},
  { section: 'Deployment', items: [
    { slug: 'hosting', title: 'Hosting & Failover' },
    { slug: 'deployment', title: 'CI/CD Pipeline' },
  ]},
  { section: 'Backend', items: [
    { slug: 'authentication', title: 'Authentication' },
    { slug: 'database', title: 'Database Schema' },
    { slug: 'api-reference', title: 'API Reference' },
  ]},
  { section: 'Frontend', items: [
    { slug: 'frontend', title: 'Frontend Architecture' },
  ]},
  { section: 'Support', items: [
    { slug: 'faq', title: 'FAQ' },
  ]},
];