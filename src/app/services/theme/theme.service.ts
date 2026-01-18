import { Injectable, signal, effect } from '@angular/core';

export type ThemeOption = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'gstm-theme-preference';
  
  // Signals to track state
  currentTheme = signal<ThemeOption>('system');
  isSettingsOpen = signal<boolean>(false);

  constructor() {
    // 1. Load saved preference
    const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeOption;
    if (saved) {
      this.currentTheme.set(saved);
    }

    // 2. Apply theme whenever signal changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });

    // 3. Listen for OS system changes (if user selects 'system')
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  setTheme(theme: ThemeOption) {
    this.currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  toggleSettings() {
    console.log('Settings toggled! Current state:', !this.isSettingsOpen());
    this.isSettingsOpen.update(v => !v);
  }

  closeSettings() {
    this.isSettingsOpen.set(false);
  }

  private applyTheme(theme: ThemeOption) {
    const root = document.documentElement;
    let isDark = false;

    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }

    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}