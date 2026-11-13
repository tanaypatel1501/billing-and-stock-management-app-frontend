import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  scrollToFeatures(element: HTMLElement) {
    element.scrollIntoView({ behavior: 'smooth' });
  }

  activePosition = 3;
  isResetting = false;
  private readonly featureCount = 3;
  private pendingLoopReset: number | null = null;
  private autoplay?: ReturnType<typeof setInterval>;
  private touchX = 0;
  private touchY = 0;

  ngOnInit(): void { this.startAutoplay(); }
  ngOnDestroy(): void { this.stopAutoplay(); }

  readonly features = [
    {
      number: '01',
      title: 'Smart Billing',
      description: 'Generate professional invoices instantly with automated GST calculations and printable formats.',
      icon: 'billing',
      iconClass: 'c1'
    },
    {
      number: '02',
      title: 'Stock Management',
      description: 'Real-time inventory tracking with low-stock alerts and comprehensive medicine categorization.',
      icon: 'stock',
      iconClass: 'c2'
    },
    {
      number: '03',
      title: 'Verified Products',
      description: 'Request new products effortlessly. Our admin team verifies all entries to ensure catalog integrity.',
      icon: 'verified',
      iconClass: 'c3'
    }
  ];

  readonly renderedFeatures = [
    ...this.features,
    ...this.features,
    ...this.features
  ];


  get activeFeature(): number {
    return this.activePosition % this.featureCount;
  }

  isNear(index: number): boolean {
    return Math.abs(index - this.activePosition) === 1;
  }

  goTo(index: number): void {
    if (this.pendingLoopReset !== null) return;

    const logicalIndex = index % this.featureCount;

    const candidates = [
      logicalIndex,
      logicalIndex + this.featureCount,
      logicalIndex + this.featureCount * 2
    ];

    this.activePosition = candidates.reduce((closest, candidate) =>
      Math.abs(candidate - this.activePosition) <
      Math.abs(closest - this.activePosition)
        ? candidate
        : closest
    );
  }

  next(): void {
    if (this.pendingLoopReset !== null || this.activePosition >= 6) return;

    // 3 -> 4 -> 5 -> 6 (clone of card 1)
    if (this.activePosition === 5) {
      this.pendingLoopReset = 3;
    }

    this.activePosition++;
  }

  prev(): void {
    if (this.pendingLoopReset !== null || this.activePosition <= 0) return;

    // 3 -> 2 (previous-cycle clone of card 3)
    if (this.activePosition === 3) {
      this.pendingLoopReset = 5;
    }

    this.activePosition--;
  }

  onCardTransitionEnd(event: TransitionEvent): void {
    const card = event.target as HTMLElement;

    if (
      event.propertyName !== 'transform' ||
      !card.classList.contains('feature-card') ||
      Number(card.dataset['index']) !== this.activePosition ||
      this.pendingLoopReset === null
    ) {
      return;
    }

    const resetPosition = this.pendingLoopReset;

    // Disable transitions for the invisible index reset.
    this.isResetting = true;
    this.activePosition = resetPosition;
    this.pendingLoopReset = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.isResetting = false;
      });
    });
  }

  startAutoplay(): void {
    this.stopAutoplay();
    if (typeof window === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    this.autoplay = setInterval(() => this.next(), 5000);
  }
  stopAutoplay(): void {
    if (this.autoplay) { clearInterval(this.autoplay); this.autoplay = undefined; }
  }

  // Hover-pause for mouse only. Touch screens fire an emulated mouseenter after a tap
  // with no matching mouseleave, which used to leave autoplay stuck off.
  onPointerEnter(e: PointerEvent): void { if (e.pointerType === 'mouse') { this.stopAutoplay(); } }
  onPointerLeave(e: PointerEvent): void { if (e.pointerType === 'mouse') { this.startAutoplay(); } }

  // Swipe: change card on a horizontal swipe, then resume autoplay.
  onTouchStart(e: TouchEvent): void {
    this.touchX = e.changedTouches[0].clientX;
    this.touchY = e.changedTouches[0].clientY;
    this.stopAutoplay();
  }
  onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchX;
    const dy = e.changedTouches[0].clientY - this.touchY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {   // ignore vertical page scrolls
      dx < 0 ? this.next() : this.prev();
    }
    this.startAutoplay();                                     // restarts the 5s timer
  }
}