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

  activeFeature = 0;
  private readonly featureCount = 3;
  private autoplay?: ReturnType<typeof setInterval>;
  private touchX = 0;
  private touchY = 0;

  ngOnInit(): void { this.startAutoplay(); }
  ngOnDestroy(): void { this.stopAutoplay(); }

  goTo(i: number): void { this.activeFeature = (i + this.featureCount) % this.featureCount; }
  next(): void { this.goTo(this.activeFeature + 1); }
  prev(): void { this.goTo(this.activeFeature - 1); }

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