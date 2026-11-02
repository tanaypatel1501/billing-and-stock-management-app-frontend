import { Component, OnInit, OnDestroy } from '@angular/core';
import { ThemeService, ThemeOption } from 'src/app/services/theme/theme.service';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { RequestCacheService } from 'src/app/services/cache/request-cache.service';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

type Section = 'tax' | 'template';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false
})
export class SettingsComponent implements OnInit, OnDestroy {
  faCheck = faCheck;

  themeOptions: { value: ThemeOption; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  taxModes = [
    { value: 'CGST_SGST', label: 'CGST + SGST', sub: 'Intra-state sales' },
    { value: 'IGST', label: 'IGST', sub: 'Inter-state sales' }
  ];

  userId: any = null;
  isUser = false;
  isLoading = false;
  hasDetails = false;
  saving = false;

  details: any = null;
  templates: any[] = [];
  taxMode = 'CGST_SGST';
  selectedTemplate = 'template1';

  status: { section: Section; text: string; error: boolean } | null = null;
  private statusTimer: any;

  constructor(
    public themeService: ThemeService,
    private authService: AuthService,
    private requestCache: RequestCacheService
  ) {}

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.isUser = UserStorageService.isUserLoggedIn() && !UserStorageService.isAdminLoggedIn();
    if (this.isUser && this.userId) {
      this.loadBusinessSettings();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.statusTimer);
  }

  get canEdit(): boolean {
    return this.hasDetails && !this.saving && !this.isLoading;
  }

  // ---------- Appearance ----------
  selectTheme(theme: ThemeOption): void {
    this.themeService.setTheme(theme);
  }

  // ---------- Business settings ----------
  private loadBusinessSettings(): void {
    this.isLoading = true;
    this.authService.getAvailableTemplates().subscribe(t => (this.templates = t));

    const key = `details:${this.userId}`;
    const cached = this.requestCache.get(key);
    if (cached) {
      this.applyDetails(cached);
      return;
    }

    this.authService.getDetailsByUserId(this.userId).subscribe(
      d => {
        if (d) this.requestCache.set(key, d);
        this.applyDetails(d);
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  private applyDetails(d: any): void {
    this.details = d || null;
    this.hasDetails = !!d;
    this.taxMode = d?.taxMode || 'CGST_SGST';
    this.selectedTemplate = d?.preferredTemplate || 'template1';
    this.isLoading = false;
  }

  selectTax(mode: string): void {
    if (!this.canEdit || mode === this.taxMode) return;
    const prev = this.taxMode;
    this.taxMode = mode;
    this.save('tax', { taxMode: mode }, () => (this.taxMode = prev));
  }

  selectTemplate(id: string): void {
    if (!this.canEdit || id === this.selectedTemplate) return;
    const prev = this.selectedTemplate;
    this.selectedTemplate = id;
    this.save('template', { preferredTemplate: id }, () => (this.selectedTemplate = prev));
  }

  private save(section: Section, patch: any, revert: () => void): void {
    this.saving = true;
    this.authService.editDetails(this.userId, { ...this.details, ...patch }).subscribe(
      updated => {
        this.details = updated || { ...this.details, ...patch };
        this.requestCache.set(`details:${this.userId}`, this.details);
        this.saving = false;
        this.flash(section, 'Saved', false);
      },
      () => {
        revert();
        this.saving = false;
        this.flash(section, 'Couldn’t save. Please try again.', true);
      }
    );
  }

  private flash(section: Section, text: string, error: boolean): void {
    clearTimeout(this.statusTimer);
    this.status = { section, text, error };
    this.statusTimer = setTimeout(() => (this.status = null), error ? 4000 : 1800);
  }
}