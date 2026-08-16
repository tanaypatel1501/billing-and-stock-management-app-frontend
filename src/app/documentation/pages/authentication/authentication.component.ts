import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocDiagramComponent } from '../../shared/doc-diagram/doc-diagram.component';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-authentication',
  standalone: true,
  imports: [CommonModule, DocDiagramComponent, DocCalloutComponent],
  template: `
    <h1>Authentication & Authorization</h1>

    <h2>Mechanism</h2>
    <ul>
      <li><strong>Stateless JWT auth.</strong> No server-side session — every request needs a valid <code>Authorization: Bearer &lt;token&gt;</code> header.</li>
      <li><strong>Token issuance:</strong> <code>JwtUtil.generateToken(username, userId, role)</code> embeds <code>userId</code> and <code>role</code> as claims, signed HS256.</li>
      <li><strong>Token lifetime:</strong> 30 minutes, with a separate <code>/refresh-token</code> endpoint.</li>
      <li><strong>Filter chain:</strong> <code>JwtRequestFilter</code> runs before Spring Security's own auth filter, populating the <code>SecurityContext</code>.</li>
      <li><strong>Authorization:</strong> coarse <code>/api/**</code> → authenticated, plus fine-grained <code>SecurityUtils.requireOwnership()</code> and <code>@PreAuthorize</code> checks per resource.</li>
      <li><strong>Google Sign-In:</strong> ID token verified server-side, then linked or silently created before issuing the app's own JWT.</li>
    </ul>

    <doc-callout type="warning" title="Short token lifetime">
      Access tokens expire in 30 minutes. Make sure any long-running client task (e.g. mid-bill-creation)
      has a refresh path that doesn't silently drop user work if a refresh call itself fails.
    </doc-callout>

    <h2>Password login</h2>
    <doc-diagram [diagram]="loginDiagram"></doc-diagram>

    <h2>Google Sign-In</h2>
    <doc-diagram [diagram]="googleDiagram"></doc-diagram>

    <h2>Authenticated request flow</h2>
    <doc-diagram [diagram]="requestDiagram"></doc-diagram>
  `
})
export class AuthenticationComponent {
  loginDiagram = `
sequenceDiagram
    participant U as User
    participant B as Backend
    participant DB as MySQL
    U->>B: POST /authenticate
    B->>DB: Load user by email
    DB-->>B: User row
    B->>B: BCrypt verify
    alt valid
        B-->>U: 200 + JWT
    else invalid
        B-->>U: 401
    end
  `;

  googleDiagram = `
sequenceDiagram
    participant U as User
    participant G as Google Identity
    participant B as Backend
    U->>G: Sign-In popup
    G-->>U: Google ID token
    U->>B: POST /auth/google
    B->>G: Verify token server-side
    G-->>B: Verified claims
    B->>B: Find-or-create user
    B-->>U: 200 + app JWT
  `;

  requestDiagram = `
sequenceDiagram
    participant U as Client
    participant JWT as JwtRequestFilter
    participant SEC as AuthorizationFilter
    participant CTRL as Controller
    U->>JWT: Request + Bearer token
    JWT->>JWT: Validate, populate SecurityContext
    JWT->>SEC: Forward
    SEC->>CTRL: Forward
    CTRL->>CTRL: requireOwnership check
    CTRL-->>U: 200 or 403
  `;
}