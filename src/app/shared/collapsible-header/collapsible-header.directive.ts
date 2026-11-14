import { Directive, ElementRef, NgZone, OnDestroy, OnInit } from '@angular/core';

const COLLAPSE_AFTER = 90;        // px scrolled before the header collapses
const EXPAND_NEAR_TOP = 12;       // back near the top: expand again automatically
const REARM_DISTANCE = 140;       // after a manual expand, scroll this much further before collapsing again
const SWIPE_DOWN_DISTANCE = 24;   // px of downward swipe on the collapsed bar that expands it
const ANIMATION_MS = 300;

/**
 * Put on a wrapper div that contains exactly one header card:
 *   <div class="gstm-sticky-wrap" appCollapsibleHeader> <div class="modern-header">...</div> </div>
 * The wrapper sticks under the navbar. Scrolling down collapses the card to a slim bar; tap it,
 * press Enter, or swipe down on it to expand. It expands by itself when you return to the top.
 * The wrapper keeps its height while collapsed, so the page content never jumps.
 */
@Directive({
  selector: '[appCollapsibleHeader]',
  standalone: true
})
export class CollapsibleHeaderDirective implements OnInit, OnDestroy {

  private collapsed = false;
  private rearmFrom = 0;
  private ticking = false;
  private touchStartY: number | null = null;
  private cleanupTimer: any = null;

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) {}

  private get host(): HTMLElement {
    return this.el.nativeElement;
  }

  private get card(): HTMLElement | null {
    return this.host.firstElementChild as HTMLElement | null;
  }

  private onScroll = (): void => {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.ticking = false;
      this.evaluate();
    });
  };

  private onClick = (event: Event): void => {
    if (!this.collapsed) return;
    if ((event.target as HTMLElement).closest('.back-btn')) return;   // the back button keeps its own job
    this.expand(true);
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (this.collapsed && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.expand(true);
    }
  };

  private onTouchStart = (event: TouchEvent): void => {
    this.touchStartY = this.collapsed ? event.touches[0].clientY : null;
  };

  private onTouchMove = (event: TouchEvent): void => {
    if (this.touchStartY === null) return;
    if (event.touches[0].clientY - this.touchStartY > SWIPE_DOWN_DISTANCE) {
      this.touchStartY = null;
      this.expand(true);
    }
  };

  private onTouchEnd = (): void => {
    this.touchStartY = null;
  };

  ngOnInit(): void {
    this.host.classList.add('gstm-sticky-wrap');

    // Scroll work stays outside Angular so it never triggers change detection
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.host.addEventListener('click', this.onClick);
      this.host.addEventListener('keydown', this.onKeydown);
      this.host.addEventListener('touchstart', this.onTouchStart, { passive: true });
      this.host.addEventListener('touchmove', this.onTouchMove, { passive: true });
      this.host.addEventListener('touchend', this.onTouchEnd, { passive: true });
    });

    // The page may already be scrolled (back navigation)
    setTimeout(() => this.evaluate());
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('keydown', this.onKeydown);
    this.host.removeEventListener('touchstart', this.onTouchStart);
    this.host.removeEventListener('touchmove', this.onTouchMove);
    this.host.removeEventListener('touchend', this.onTouchEnd);
    clearTimeout(this.cleanupTimer);
  }

  private evaluate(): void {
    const y = window.scrollY || document.documentElement.scrollTop || 0;

    if (y <= EXPAND_NEAR_TOP) {
      this.rearmFrom = 0;
      if (this.collapsed) this.expand(false);
      return;
    }
    if (this.collapsed) return;

    const threshold = this.rearmFrom > 0 ? this.rearmFrom + REARM_DISTANCE : COLLAPSE_AFTER;
    if (y > threshold && !this.hasFocusInside()) {
      this.collapse();
    }
  }

  /** Do not collapse while the user is typing in the search box or using a filter control. */
  private hasFocusInside(): boolean {
    const active = document.activeElement;
    return !!active && active !== document.body && this.host.contains(active);
  }

  private collapse(): void {
    const card = this.card;
    if (!card) return;

    clearTimeout(this.cleanupTimer);
    this.host.style.height = `${this.host.offsetHeight}px`;   // keep the layout footprint: no content jump
    card.style.maxHeight = `${card.offsetHeight}px`;          // starting point for the shrink animation
    void card.offsetHeight;                                   // flush styles before the class is added

    this.host.classList.add('gstm-collapsed');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Show search and filters');
    this.collapsed = true;
  }

  private expand(manual: boolean): void {
    const card = this.card;
    this.collapsed = false;
    this.rearmFrom = manual ? (window.scrollY || 0) : 0;      // after a tap, stay open until the user scrolls on

    this.host.classList.remove('gstm-collapsed');
    card?.removeAttribute('role');
    card?.removeAttribute('tabindex');
    card?.removeAttribute('aria-label');

    clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => {
      this.host.style.height = '';
      if (card) card.style.maxHeight = '';
    }, ANIMATION_MS + 40);
  }
}