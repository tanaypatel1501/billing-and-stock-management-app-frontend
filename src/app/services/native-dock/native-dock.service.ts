import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface NativeDockItem {
  id: string;
  label: string;
  w: number;
  h: number;
  path: string;
  badge?: number;
  disabled?: boolean;
  selectable?: boolean;
}

interface LiquidDockPlugin {
  show(options: { items: NativeDockItem[]; activeId: string; dark: boolean; menuOpen: boolean }): Promise<void>;
  hide(): Promise<void>;
  addListener(
    eventName: 'itemTap',
    cb: (e: { id: string }) => void
  ): Promise<PluginListenerHandle>;
}

const LiquidDock = registerPlugin<LiquidDockPlugin>('LiquidDock');

@Injectable({ providedIn: 'root' })
export class NativeDockService {
  private suppressCount = 0;
  private suppressedSubject = new BehaviorSubject<boolean>(false);

  /** true while at least one full-screen overlay wants the dock hidden */
  readonly suppressed$ = this.suppressedSubject.asObservable();

  /** Turns a FontAwesome icon into the SVG data the native dock draws. */
  static icon(def: IconDefinition): { w: number; h: number; path: string } {
    const [w, h, , , path] = def.icon;
    return { w, h, path: path as string };
  }

  /**
   * Call when a full-screen overlay opens. Returns a function that releases it.
   * Safe to call the release function more than once.
   */
  suppress(): () => void {
    this.suppressCount++;
    this.suppressedSubject.next(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.suppressCount = Math.max(0, this.suppressCount - 1);
      this.suppressedSubject.next(this.suppressCount > 0);
    };
  }

  show(items: NativeDockItem[], activeId: string, dark: boolean, menuOpen = false): void {
    LiquidDock.show({ items, activeId, dark, menuOpen }).catch(e =>
      console.warn('LiquidDock.show failed', e)
    );
  }

  hide(): void {
    LiquidDock.hide().catch(() => {});
  }

  onTap(cb: (id: string) => void): Promise<PluginListenerHandle> {
    return LiquidDock.addListener('itemTap', e => cb(e.id));
  }
}