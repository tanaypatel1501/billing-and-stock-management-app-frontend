import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

type BotStatus = 'answered' | 'refused' | 'clarification_needed' | 'needs_choice' | 'not_found' | 'not_available' | 'failed';

/**
 * offscreen : hidden past the right edge (before the intro)
 * greeting  : slid in, waving, speech bubble showing
 * leaving   : hopping back to the edge (also used when the chat is closed)
 * peek      : only a sliver is visible at the screen edge
 * open      : fully out, chat panel open
 */
type Dock = 'offscreen' | 'greeting' | 'leaving' | 'peek' | 'open';

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  status?: BotStatus;
  sql?: string;
  showSql?: boolean;
  columns?: string[];
  rows?: any[][];
  options?: string[];
  token?: string;
}

const GREETED_KEY = 'gstm_bot_greeted';
const HELLO = 'Hi! Ask me about your sales, bills or products.';

@Component({
  selector: 'app-sales-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './sales-chatbot.component.html',
  styleUrls: ['./sales-chatbot.component.scss']
})
export class SalesChatbotComponent implements OnInit, OnDestroy {
  faPaperPlane = faPaperPlane;
  faXmark = faXmark;

  @ViewChild('scrollBox') scrollBox?: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  loggedIn = false;
  dock: Dock = 'offscreen';
  showBubble = false;

  loading = false;
  draft = '';
  readonly maxLen = 300;

  readonly suggestions = [
    'Revenue this month?',
    'Top 5 selling products',
    'How many bills are unpaid?'
  ];

  messages: ChatMsg[] = [{ role: 'bot', text: HELLO }];

  private authSub?: Subscription;
  private timers: any[] = [];

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}

  get open(): boolean {
    return this.dock === 'open';
  }

  // ---------------------------------------------------------------- lifecycle

  ngOnInit(): void {
    this.authSub = this.authService.isAuthenticated$.subscribe(isIn => isIn ? this.onLogin() : this.onLogout());
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.clearTimers();
  }

  private onLogin(): void {
    // Only shop accounts (role USER) have bills. Admins never see the assistant or its greeting.
    // The token is saved before isAuthenticated$ emits, so the role is already readable here.
    if (!UserStorageService.isUserLoggedIn()) {
      this.onLogout();
      return;
    }
    if (this.loggedIn) return;
    this.loggedIn = true;
    this.dock = 'offscreen';

    if (this.prefersReducedMotion() || this.alreadyGreeted()) {
      this.later(50, () => this.dock = 'peek');
      return;
    }
    this.markGreeted();
    this.playIntro();
  }

  /** Wipe the conversation on logout so the next person on this browser never sees it. */
  private onLogout(): void {
    this.clearTimers();
    this.loggedIn = false;
    this.dock = 'offscreen';
    this.showBubble = false;
    this.loading = false;
    this.draft = '';
    this.messages = [{ role: 'bot', text: HELLO }];
    this.clearGreeted();
  }

  // ---------------------------------------------------------------- intro / docking

  /** Slide in, wave + say hi, then hop back to the edge. */
  private playIntro(): void {
    this.later(80,   () => this.dock = 'greeting');                          // slide in (CSS transition)
    this.later(800,  () => this.showBubble = true);                          // wave + speech bubble
    this.later(4200, () => { this.showBubble = false; this.dock = 'leaving'; });   // hop to the edge
    this.later(4950, () => this.dock = 'peek');
  }

  toggle(): void {
    this.dock === 'open' ? this.closeChat() : this.openChat();
  }

  private openChat(): void {
    this.clearTimers();
    this.showBubble = false;
    this.dock = 'open';
    this.later(450, () => this.inputEl?.nativeElement.focus());
  }

  private closeChat(): void {
    this.dock = 'leaving';
    this.later(750, () => this.dock = 'peek');
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private alreadyGreeted(): boolean {
    try { return sessionStorage.getItem(GREETED_KEY) === '1'; } catch { return false; }
  }
  private markGreeted(): void {
    try { sessionStorage.setItem(GREETED_KEY, '1'); } catch { /* storage blocked: fine */ }
  }
  private clearGreeted(): void {
    try { sessionStorage.removeItem(GREETED_KEY); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------- chat

  useSuggestion(text: string): void {
    this.draft = text;
    this.send();
  }

  send(): void {
    const question = this.draft.trim().slice(0, this.maxLen);
    if (!question || this.loading) return;

    const history = this.buildHistory();     // before adding the new message
    this.messages.push({ role: 'user', text: question });
    this.draft = '';
    this.call(this.authService.askSalesBot(question, undefined, undefined, history));
  }

  /** User tapped one of the suggested names ("Dr. S.K. Jain" vs "Dr. Sunil Kumar Jain"). */
  choose(msg: ChatMsg, option: string): void {
    if (this.loading || !msg.token) return;
    const token = msg.token;
    msg.options = undefined;          // buttons disappear once used
    msg.token = undefined;

    this.messages.push({ role: 'user', text: option });
    this.call(this.authService.askSalesBot('', token, option));
  }

  private call(request$: ReturnType<AuthService['askSalesBot']>): void {
    this.loading = true;
    this.scrollDown();

    request$.subscribe({
      next: (res: any) => {
        this.messages.push({
          role: 'bot',
          text: res?.answer || 'I could not find an answer for that.',
          status: res?.status,
          sql: res?.sql || undefined,
          columns: res?.columns || undefined,
          rows: res?.rows || undefined,
          options: res?.options || undefined,
          token: res?.token || undefined
        });
        this.finish();
      },
      error: (err) => {
        const text = err?.status === 429
          ? 'You are asking too fast. Try again in a minute.'
          : 'Something went wrong. Please try again.';
        this.messages.push({ role: 'bot', text, status: 'failed' });
        this.finish();
      }
    });
  }

  /** Last few turns (text only) so the backend can understand "ok show that". */
  private buildHistory(): { role: string; text: string }[] {
    return this.messages
      .slice(1)                                   // skip the greeting
      .filter(m => m.status !== 'failed')
      .slice(-6)
      .map(m => ({ role: m.role, text: m.text.slice(0, 300) }));
  }

  // ---------------------------------------------------------------- table helpers

  label(col: string): string {
    return col.replace(/_/g, ' ');
  }

  isNumber(v: any): boolean {
    return typeof v === 'number';
  }

  private isMoney(col: string): boolean {
    return /(^|_)(revenue|amount|price|rate|mrp|value|sales|sale)(_|$)/i.test(col);
  }

  formatCell(col: string, v: any): string {
    if (v === null || v === undefined) return '–';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'number') {
      const n = v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      return this.isMoney(col) ? '₹' + n : n;
    }
    return String(v);
  }

  private finish(): void {
    this.loading = false;
    this.cdr.markForCheck();
    this.scrollDown();
  }

  private scrollDown(): void {
    setTimeout(() => {
      const el = this.scrollBox?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }
}