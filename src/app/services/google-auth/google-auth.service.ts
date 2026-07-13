// google-auth.service.ts
import { Injectable } from '@angular/core';
import { ConfigService } from 'src/app/services/config.service';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private initialized = false;
  private currentCallback: (response: any) => void = () => {};

  constructor(private config: ConfigService) {}

  init(callback: (response: any) => void): void {
    this.currentCallback = callback;
    if (typeof google === 'undefined') return;
    if (!this.initialized) {
      google.accounts.id.initialize({
        client_id: this.config.googleClientId,
        callback: (response: any) => this.currentCallback(response), 
        use_fedcm_for_prompt: true,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      this.initialized = true;
    }
  }

  renderButton(elementId: string): void {
    if (typeof google === 'undefined') return;
    google.accounts.id.renderButton(document.getElementById(elementId), {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 430
    });
  }

  cancel(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.cancel();
    }
  }
}