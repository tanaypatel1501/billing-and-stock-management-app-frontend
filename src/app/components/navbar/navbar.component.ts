import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { Observable, Subscription } from 'rxjs';
import { AppStateService } from 'src/app/services/app-state.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { Capacitor } from '@capacitor/core';
import { PluginListenerHandle } from '@capacitor/core';
import { NativeDockService } from 'src/app/services/native-dock/native-dock.service';

import {
  faUserPlus,
  faSignInAlt,
  faSignOutAlt,
  faUser,
  faChartLine,
  faBoxOpen,
  faBoxes,
  faFileInvoice,
  faMoneyBillWave,
  faBuilding,
  faGear,
  faChartBar,
  faClockRotateLeft,
  faClipboardList,
  faBars,
  faUsers,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

type Spring = { value: number; velocity: number; target: number };

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated$!: Observable<boolean>;
  detailsValid$!: Observable<boolean>;
  detailsValid = false;
  detailsSub?: Subscription;
  authSub?: Subscription;
  errorMessage: string | null = null;
  mobileMenuOpen: boolean = false;
  faUserPlus = faUserPlus;
  faSignInAlt = faSignInAlt;
  faSignOutAlt = faSignOutAlt;
  faUser = faUser;
  faChartLine = faChartLine;
  faBoxOpen = faBoxOpen;
  faBoxes = faBoxes;
  faFileInvoice = faFileInvoice;
  faMoneyBillWave = faMoneyBillWave;
  faBuilding = faBuilding;
  faGear = faGear;
  faChartBar = faChartBar;
  faClockRotateLeft = faClockRotateLeft;
  faClipboardList = faClipboardList;
  faBars = faBars;
  faUsers = faUsers;
  faChevronRight = faChevronRight;

  pendingRequestCount = 0;
  // optionally poll: authService.getPendingProductRequests().subscribe(r => this.pendingRequestCount = r.length)
  hasPurchasers = false;
  private purchasersSub?: Subscription;

  isAndroidApp = false;

  private dockTapHandle?: PluginListenerHandle;
  private nativeSubs = new Subscription();
  private themeObserver?: MutationObserver;
  private dockAuthenticated = false;
  private dockSuppressed = false;

  // ---------- Dock gesture state ----------
  private dockPointerActive = false;
  private dockSwipeDetected = false;
  private dockPointerStartX = 0;
  private dockElement?: HTMLElement;
  private dockProgrammaticClick = false;

  // ---------- Dock: magnifier lens ----------
  private static readonly LENS_MAGNIFY = 1.25;  // how much the lens enlarges what's under it
  private static readonly LENS_HALF_W = 38;     // half of lens width (76px)
  private static readonly LENS_HALF_H = 40;     // half of lens height (80px)

  private glassEl?: HTMLElement;
  private lensEl?: HTMLElement;
  private lensContentEl?: HTMLElement;
  private glassCenterY = 33;
  private lensX: Spring = { value: 0, velocity: 0, target: 0 };
  private lensPresence: Spring = { value: 0, velocity: 0, target: 0 };
  private rafId = 0;
  private lastTime = 0;
  private reduceMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private router: Router,
    private authService: AuthService,
    private appState: AppStateService,
    public themeService: ThemeService,
    private zone: NgZone,
    private nativeDock: NativeDockService
  ) { }

  ngOnInit() {
    this.isAndroidApp = Capacitor.isNativePlatform() &&
                    Capacitor.getPlatform() === 'android';
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.authService.updateNavBar();
    this.detailsValid$ = this.appState.detailsValid$;
    this.detailsSub = this.detailsValid$.subscribe(v => {
      this.detailsValid = !!v;
      if (this.detailsValid) this.errorMessage = null;
    });

    const uid = UserStorageService.getUserId();
    if (uid) {
      this.appState.refreshDetailsValidity(uid);
      this.appState.refreshHasPurchasers(uid);
    }

    this.authSub = this.isAuthenticated$.subscribe(auth => {
      if (auth) {
        const id = UserStorageService.getUserId();
        if (id) this.appState.refreshDetailsValidity(id);
        if (id) this.appState.refreshHasPurchasers(id);
      }
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.mobileMenuOpen = false;
      });
    this.purchasersSub = this.appState.hasPurchasers$.subscribe(v => {
      this.hasPurchasers = v;
    });

    if (this.isAndroidApp) {
      this.initNativeDock();
    }
  }

  ngOnDestroy(): void {
    if (this.detailsSub) this.detailsSub.unsubscribe();
    if (this.authSub) this.authSub.unsubscribe();
    if (this.purchasersSub) this.purchasersSub.unsubscribe();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.nativeSubs.unsubscribe();
    this.themeObserver?.disconnect();
    this.dockTapHandle?.remove();
  }

  // These getters are synchronous checks used only to determine role for specific links
  // The 'async' pipe on isAuthenticated$ handles the main login/logout display switch.
  get isUserLoggedIn(): boolean {
    return UserStorageService.isUserLoggedIn();
  }

  get isAdminLoggedIn(): boolean {
    return UserStorageService.isAdminLoggedIn();
  }

  logout() {
    this.closeMobileMenu();
    this.authService.signOut();
    this.router.navigateByUrl('login');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  onCreateBill(event: Event) {
    this.closeMobileMenu();
    if (!this.detailsValid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.errorMessage = 'Please update all details in Details Tab in order to create a bill';
      setTimeout(() => { this.errorMessage = null; }, 5000);
      return;
    }
    // allowed — navigate to create bill
    this.router.navigateByUrl('/user/create-bill');
  }

  get isCreateBillActive(): boolean {
    return this.router.url === '/user/create-bill';
  }

  openSettings() {
    this.closeMobileMenu();
    this.router.navigateByUrl('/settings');
  }

  // =========================================================
  // DOCK POINTER HANDLERS
  // =========================================================

  onDockPointerDown(event: PointerEvent): void {
    if (!this.isAndroidApp) return;

    const dock = event.currentTarget as HTMLElement;
    this.dockElement = dock;
    this.dockPointerActive = true;
    this.dockSwipeDetected = false;
    this.dockPointerStartX = event.clientX;

    try {
      dock.setPointerCapture(event.pointerId);
    } catch {
      // not available in some WebViews
    }

    this.cacheDock(dock);
    if (!this.glassEl) return;

    // If the lens is hidden, appear under the finger instead of flying in from the last position.
    if (this.lensPresence.value < 0.05) {
      const x = this.clampLens(this.fingerX(event.clientX));
      this.lensX.value = this.lensX.target = x;
      this.lensX.velocity = 0;
    }

    this.lensPresence.target = 1;
    this.lensX.target = this.clampLens(this.fingerX(event.clientX));  // respond on pointer-down
    this.startLoop();
  }

  onDockPointerMove(event: PointerEvent): void {
    if (!this.isAndroidApp || !this.dockPointerActive || !this.glassEl) return;

    if (Math.abs(event.clientX - this.dockPointerStartX) > 8) {
      this.dockSwipeDetected = true;
    }

    this.lensX.target = this.clampLens(this.fingerX(event.clientX));
    this.startLoop();
  }

  onDockPointerUp(event: PointerEvent): void {
    if (!this.isAndroidApp) return;

    const dock = this.dockElement;

    if (dock) {
      try {
        dock.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
    }

    // Slide-to-select: activate the item under the finger on release.
    if (this.dockSwipeDetected && dock) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('.dock-item') as HTMLElement | null;

      if (target && dock.contains(target)) {
        this.dockProgrammaticClick = true;
        target.click();
        this.dockProgrammaticClick = false;
      }

      // Keep the flag set briefly so the browser's own trailing click is swallowed.
      setTimeout(() => (this.dockSwipeDetected = false), 300);
    }

    this.dockPointerActive = false;
    this.releaseDock();
  }

  onDockPointerCancel(_event: PointerEvent): void {
    if (!this.isAndroidApp) return;
    this.dockPointerActive = false;
    this.releaseDock();
  }

  onDockPointerLeave(_event: PointerEvent): void {
    if (!this.isAndroidApp) return;
    // Pointer capture keeps the interaction alive while sliding.
    if (!this.dockPointerActive) this.releaseDock();
  }

  onDockItemClick(event: MouseEvent): void {
    if (this.isAndroidApp && this.dockSwipeDetected && !this.dockProgrammaticClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.closeMobileMenu();
  }

  onDockMenuClick(event: MouseEvent): void {
    if (this.isAndroidApp && this.dockSwipeDetected && !this.dockProgrammaticClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.toggleMobileMenu();
  }

  // =========================================================
  // DOCK HELPERS: lens + magnified clone
  // =========================================================

  private cacheDock(dock: HTMLElement): void {
    this.glassEl = dock.querySelector('.dock-glass') as HTMLElement;
    this.lensEl = dock.querySelector('.dock-lens') as HTMLElement;
    this.lensContentEl = dock.querySelector('.dock-lens-content') as HTMLElement;
    if (!this.glassEl || !this.lensEl || !this.lensContentEl) return;

    this.glassCenterY = this.glassEl.offsetHeight / 2;
    this.buildLensClone();
  }

  /**
   * Rebuilds the magnified copy of the dock row inside the lens.
   * Done on every pointer-down so active state, badge count and admin/user items are current.
   * cloneNode keeps Angular's scoped-style attributes, so the clone looks identical.
   */
  private buildLensClone(): void {
    const glass = this.glassEl!;
    const content = this.lensContentEl!;

    content.style.width = `${glass.offsetWidth}px`;
    content.style.height = `${glass.offsetHeight}px`;
    content.textContent = '';

    glass.querySelectorAll('.dock-item').forEach(item => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      content.appendChild(clone);
    });
  }

  private fingerX(clientX: number): number {
    const rect = this.glassEl!.getBoundingClientRect();
    return Math.max(0, Math.min(rect.width, clientX - rect.left));
  }

  private clampLens(x: number): number {
    const w = this.glassEl!.offsetWidth;
    const h = NavbarComponent.LENS_HALF_W;
    return Math.max(h, Math.min(w - h, x));
  }

  private releaseDock(): void {
    this.lensPresence.target = 0;
    this.startLoop();
  }

  private startLoop(): void {
    if (this.rafId) return;
    this.lastTime = performance.now();
    // Run outside Angular so 60fps frames don't trigger change detection.
    this.zone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(this.tick);
    });
  }

  private tick = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    // Lens follows the finger: snappy, critically damped.
    this.stepSpring(this.lensX, dt, 0.11, 1);
    // Lens grows in with a little overshoot (a gesture drives it).
    this.stepSpring(this.lensPresence, dt, 0.3, this.reduceMotion ? 1 : 0.72);

    if (this.lensEl && this.lensContentEl) {
      const M = NavbarComponent.LENS_MAGNIFY;
      const hw = NavbarComponent.LENS_HALF_W;
      const hh = NavbarComponent.LENS_HALF_H;
      const cx = this.lensX.value;
      const pres = this.lensPresence.value;

      // Lens box slides with the finger and scales in/out.
      this.lensEl.style.transform =
        `translate3d(${(cx - hw).toFixed(2)}px,0,0) scale(${(0.8 + 0.2 * pres).toFixed(3)})`;
      this.lensEl.style.opacity = String(Math.max(0, Math.min(1, pres)));

      // Magnify the clone about the lens centre so it stays aligned with what's underneath:
      // lens-local = M * glassPoint + translate, with glass point (cx, centreY) at lens centre (hw, hh).
      const tx = hw - M * cx;
      const ty = hh - M * this.glassCenterY;
      this.lensContentEl.style.transform =
        `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${M})`;
    }

    const moving = !this.settled(this.lensX) || !this.settled(this.lensPresence);
    this.rafId = moving ? requestAnimationFrame(this.tick) : 0;
  };

  private stepSpring(
    s: Spring,
    dt: number,
    response: number,   // seconds, lower = snappier
    damping: number     // 1 = no overshoot, <1 = bounce
  ): void {
    const w = (2 * Math.PI) / response;
    const accel = -(w * w) * (s.value - s.target) - 2 * damping * w * s.velocity;
    s.velocity += accel * dt;
    s.value += s.velocity * dt;
  }

  private settled(s: Spring): boolean {
    if (Math.abs(s.value - s.target) < 0.002 && Math.abs(s.velocity) < 0.02) {
      s.value = s.target;
      s.velocity = 0;
      return true;
    }
    return false;
  }

  // =========================================================
// NATIVE ANDROID DOCK
// =========================================================

private initNativeDock(): void {
  this.nativeDock
    .onTap(id => this.zone.run(() => this.onNativeDockTap(id)))
    .then(h => (this.dockTapHandle = h));

  this.nativeSubs.add(
    this.isAuthenticated$.subscribe(auth => {
      this.dockAuthenticated = !!auth;
      this.syncNativeDock();
    })
  );
  this.nativeSubs.add(
    this.nativeDock.suppressed$.subscribe(v => {
      this.dockSuppressed = v;
      this.syncNativeDock();
    })
  );
  this.nativeSubs.add(
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncNativeDock())
  );
  this.nativeSubs.add(this.appState.detailsValid$.subscribe(() => this.syncNativeDock()));

  // re-sync when the theme attribute/class changes
  this.themeObserver = new MutationObserver(() => this.syncNativeDock());
  const opts = { attributes: true, attributeFilter: ['data-theme', 'class'] };
  this.themeObserver.observe(document.documentElement, opts);
  this.themeObserver.observe(document.body, opts);
}

private syncNativeDock(): void {
  if (!this.isAndroidApp) return;
  if (!this.dockAuthenticated || this.dockSuppressed) {
    this.nativeDock.hide();
    return;
  }

  const url = this.router.url.split('?')[0];
  const dark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.getAttribute('data-theme') === 'dark';
  const I = NativeDockService.icon;
  const admin = this.isAdminLoggedIn;

  let routeActive = '';
  if (admin) {
    routeActive = url.startsWith('/admin/dashboard') ? 'home'
      : url.startsWith('/admin/add-product') ? 'add'
      : url.startsWith('/admin/product-requests') ? 'action'
      : url.startsWith('/profile') ? 'profile' : '';
  } else {
    routeActive = url.startsWith('/user/dashboard') ? 'home'
      : url.startsWith('/user/stock/add') ? 'add'
      : url.startsWith('/user/create-bill') ? 'action'
      : url.startsWith('/profile') ? 'profile' : '';
  }

  // Menu stays highlighted on the Menu screen and on pages opened from it.
  const menuPages = ['/menu', '/user/stock-logs', '/user/bills', '/user/purchasers', '/user/sales', '/user/details','/settings'];
  const activeId = routeActive || (menuPages.some(p => url.startsWith(p)) ? 'menu' : '');

  // The Menu screen is a flat page, so freeze the WebView capture there (avoids the Settings pop-up flicker).
  const freezeBackdrop = url.startsWith('/menu') || url.startsWith('/settings');

  const items = admin
    ? [
        { id: 'home', label: 'Home', ...I(faChartLine) },
        { id: 'add', label: 'Add Product', ...I(faBoxOpen) },
        { id: 'action', label: 'Requests', ...I(faClipboardList), badge: this.pendingRequestCount },
        { id: 'profile', label: 'Profile', ...I(faUser) },
        { id: 'menu', label: 'Menu', ...I(faBars) }
      ]
    : [
        { id: 'home', label: 'Home', ...I(faChartLine) },
        { id: 'add', label: 'Add Stock', ...I(faBoxes) },
        { id: 'action', label: 'Create Bill', ...I(faFileInvoice), disabled: !this.detailsValid },
        { id: 'profile', label: 'Profile', ...I(faUser) },
        { id: 'menu', label: 'Menu', ...I(faBars) }
      ];

  this.nativeDock.show(items, activeId, dark, freezeBackdrop);
}

private onNativeDockTap(id: string): void {
  const admin = this.isAdminLoggedIn;
  switch (id) {
    case 'home':
      this.router.navigateByUrl(admin ? '/admin/dashboard' : '/user/dashboard');
      break;
    case 'add':
      this.router.navigateByUrl(admin ? '/admin/add-product' : '/user/stock/add');
      break;
    case 'action':
      if (admin) {
        this.router.navigateByUrl('/admin/product-requests');
      } else if (!this.detailsValid) {
        this.errorMessage = 'Please update all details in Details Tab in order to create a bill';
        setTimeout(() => { this.errorMessage = null; }, 5000);
      } else {
        this.router.navigateByUrl('/user/create-bill');
      }
      break;
    case 'profile':
      this.router.navigateByUrl('/profile');
      break;
    case 'menu':
      this.router.navigateByUrl('/menu');
      break;
  }
}
}