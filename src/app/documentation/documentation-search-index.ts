export interface DocSearchEntry {
  slug: string;
  title: string;
  keywords: string;
}

export const DOCUMENTATION_SEARCH_INDEX: DocSearchEntry[] = [
  { slug: 'overview', title: 'Overview', keywords: 'introduction features pharmacy billing stock inventory gst invoice ocr google sign-in zip export summary' },
  { slug: 'architecture', title: 'Architecture', keywords: 'spring boot java angular thymeleaf flying saucer s3 tebi qr zxing scheduled tasks docker stack backend frontend request cache service auth service' },
  { slug: 'hosting', title: 'Hosting & Failover', keywords: 'oci oracle cloud infrastructure koyeb render cloudflare worker duckdns aiven mysql vm arm amd failover edge routing http https environment' },
  { slug: 'deployment', title: 'CI/CD Pipeline', keywords: 'github actions workflow docker build deploy pipeline master push' },
  { slug: 'authentication', title: 'Authentication', keywords: 'jwt security spring security bcrypt google sign-in refresh token filter chain security context ownership idor preauthorize role admin user' },
  { slug: 'database', title: 'Database Schema', keywords: 'mysql entity relationship bill bill items product stock stock log purchaser product request user details snapshot cgst sgst gstin foreign key' },
  { slug: 'api-reference', title: 'API Reference', keywords: 'endpoint rest controller bill pdf zip export stock product purchaser sales profile ocr postal logo' },
  { slug: 'frontend', title: 'Frontend Architecture', keywords: 'angular request cache service debounced search scroll throttle pagination infinite scroll jwt decode bulk selection export' },
  { slug: 'faq', title: 'FAQ', keywords: 'why cold start failover blank rows filler pdf performance questions troubleshooting' },
];