import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { ConfigService } from 'src/app/services/config.service';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private initialized = false;
  private nativeInitialized = false;
  private currentCallback: (response: any) => void = () => {};

  constructor(private config: ConfigService) {}

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  init(callback: (response: any) => void): void {
    if (this.isNative) return;
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
    if (this.isNative || typeof google === 'undefined') return;
    google.accounts.id.renderButton(document.getElementById(elementId), {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 430
    });
  }

  cancel(): void {
    if (this.isNative) return;
    if (typeof google !== 'undefined') {
      google.accounts.id.cancel();
    }
  }

  /** Native only: returns a Google ID token audienced to the web client ID. */
  async nativeSignIn(): Promise<string> {
    if (!this.nativeInitialized) {
      await SocialLogin.initialize({
        google: { webClientId: this.config.googleClientId }
      });
      this.nativeInitialized = true;
    }
    const res: any = await SocialLogin.login({
      provider: 'google',
      options: { scopes: ['email', 'profile'] }
    });
    const idToken = res?.result?.idToken;
    if (!idToken) throw new Error('No ID token returned from Google.');
    return idToken;
  }
}