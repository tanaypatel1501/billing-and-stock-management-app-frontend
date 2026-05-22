import { Component, HostListener, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { LabelScannerService, ScannedLabelData } from 'src/app/services/label-scanner/label-scanner.service';

@Component({
  selector: 'app-stock-form',
  templateUrl: './stock-form.component.html',
  styleUrls: ['./stock-form.component.scss']
})
export class StockFormComponent implements OnInit {

  @Input() mode: 'add' | 'edit' = 'add';

  productForm!: FormGroup;
  errorMessage: string | null = null;

  products: any[] = [];
  selectedProductId: number | null = null;
  displayName: string = '';
  stockId!: number;

  showDropdown = false;
  highlightedIndex = -1;

  page = 0;
  size = 10;
  isLoadingSearch = false;
  isMoreLoading = false;
  isLastPage = false;
  selectedMrp: number | null = null;
  selectedBatchMrp: number | null = null;
  // ── Camera Scan ───────────────────────────────────────────
  showScanner       = false;
  scanStatus: 'idle' | 'detecting' | 'scanning' | 'success' | 'error' = 'idle';
  scanMessage       = '';
  scanProgress      = 0;
  showManualCapture = false;   // fallback shutter shown after timeout

  private stream:          MediaStream | null = null;
  private videoEl!:        HTMLVideoElement;
  private canvasEl!:       HTMLCanvasElement;
  private autoScanLoop:    any = null;   // requestAnimationFrame id
  private autoScanTimer:   any = null;   // fallback timeout
  private isProcessing     = false;      // prevent overlapping OCR calls
  private attemptCount     = 0;
  private readonly CONFIDENCE_THRESHOLD = 0.50; // trigger OCR when label clearly detected
  private readonly MAX_ATTEMPTS = 20;   // ~16s of attempts at 800ms each
  private lastCentroid: { x: number; y: number } | null = null;

  private readonly MIN_FIELDS_REQUIRED = 2;   // need at least 2/3 fields to accept

  private searchTimeout: any;
  private SEARCH_DEBOUNCE_MS = 200;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private labelScanner: LabelScannerService
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.mode === 'edit') {
      this.productForm.get('name')?.disable();
      this.stockId = Number(this.route.snapshot.paramMap.get('stockId'));
      this.loadStock();
    }
  }

  private initForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      batchNo: ['', Validators.required],
      expiryDate: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(0)]],
      mrp: [null, [Validators.required, Validators.min(0)]]
    });
  }

  private formatDateForDisplay(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  }

  private toLastDayOfMonth(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  onExpiryDateChange(event: any): void {
    const value: string = event.target.value;
    if (!value) return;
    const lastDay = this.toLastDayOfMonth(value);
    this.productForm.patchValue({ expiryDate: lastDay }, { emitEvent: false });
  }

  private fetchProductName(productId: number) {
    this.authService.getProductById(productId).subscribe(
      (product: any) => {
        this.productForm.patchValue({
          name: product.name
        });
        this.selectedMrp = product.mrp ?? null;
      },
      () => {
        this.errorMessage = 'Failed to load product details';
      }
    );
  }

  // ================= LOAD STOCK (EDIT) =================

  private loadStock() {
    this.authService.getStockById(this.stockId).subscribe(
      (res: any) => {
        this.selectedProductId = res.productId;

        this.productForm.patchValue({
          batchNo: res.batchNo,
          expiryDate: this.formatDateForDisplay(res.expiryDate),
          quantity: res.quantity,
          mrp: res.mrp ?? null
        });
        this.fetchProductName(res.productId);
        this.productForm.get('name')?.disable();
      },
      () => this.errorMessage = 'Failed to load stock'
    );
  }

  // ================= PRODUCT SEARCH =================

  onProductSearch() {
    if (this.mode === 'edit') return;
    this.selectedProductId = null;
    this.highlightedIndex = -1;

    const text = this.productForm.get('name')?.value || '';
    if (!text.trim()) {
      this.products = [];
      this.showDropdown = false;
      return;
    }

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchProducts(text.trim());
    }, this.SEARCH_DEBOUNCE_MS);
  }

  private searchProducts(text: string, isNextPage = false) {
    if (isNextPage) {
      this.isMoreLoading = true;
    } else {
      this.page = 0;
      this.isLastPage = false;
      this.isLoadingSearch = true;
    }

    const body = { searchText: text, page: this.page, size: this.size };

    this.authService.searchProducts(body).subscribe(
      (res: any) => {
        const newProducts = res.content || [];
        this.products = isNextPage ? [...this.products, ...newProducts] : newProducts;
        this.isLastPage = res.last;
        this.showDropdown = true;
        this.isLoadingSearch = false;
        this.isMoreLoading = false;
      },
      () => {
        this.products = [];
        this.showDropdown = false;
        this.isLoadingSearch = false;
        this.isMoreLoading = false;
      }
    );
  }

  selectProduct(p: any) {
    this.productForm.patchValue({ name: p.name });
    this.selectedProductId = p.id;
    this.selectedMrp = p.mrp ?? null; 
    this.displayName = p.packing ? `${p.name} | ${p.packing}` : p.name; 
    this.productForm.patchValue({
      name: p.name,
      mrp: p.mrp ?? null
    });
    this.showDropdown = false;
  }

  openDropdown() {
    if (this.products.length) this.showDropdown = true;
  }

  onInputBlur() {
    setTimeout(() => this.showDropdown = false, 150);
  }

  // ================= SUBMIT =================

  onSubmit() {
    if (!this.selectedProductId) {
      this.errorMessage = 'Please select a product';
      return;
    }

    const payload: any = {
      userId: UserStorageService.getUserId(),
      productId: this.selectedProductId,
      batchNo: this.productForm.value.batchNo,
      expiryDate: this.productForm.value.expiryDate,
      quantity: this.productForm.value.quantity,
      mrp: this.productForm.value.mrp 
    };

    if (this.mode === 'edit') {
      payload.id = this.stockId;
      this.authService.updateStock(payload).subscribe(
        () => this.router.navigate(['user/dashboard']),
        () => this.errorMessage = 'Update failed'
      );
    } else {
      this.authService.addStock(payload).subscribe(
        () => this.router.navigate(['user/dashboard']),
        () => this.errorMessage = 'Add failed'
      );
    }
  }

  // ================= KEYBOARD SUPPORT =================

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.showDropdown || !this.products.length) return;

    if (event.key === 'ArrowDown') {
      this.highlightedIndex = (this.highlightedIndex + 1) % this.products.length;
      event.preventDefault();
    }
    if (event.key === 'ArrowUp') {
      this.highlightedIndex =
        (this.highlightedIndex - 1 + this.products.length) % this.products.length;
      event.preventDefault();
    }
    if (event.key === 'Enter' && this.highlightedIndex >= 0) {
      this.selectProduct(this.products[this.highlightedIndex]);
      event.preventDefault();
    }
  }

  // ── OPEN CAMERA ──────────────────────────────────────────
  async openCamera(): Promise<void> {
    this.showScanner       = true;
    this.scanStatus        = 'detecting';
    this.scanMessage       = '';
    this.scanProgress      = 0;
    this.showManualCapture = false;
    this.isProcessing      = false;
    this.attemptCount      = 0;

    await new Promise(r => setTimeout(r, 100));

    this.videoEl  = document.getElementById('scanVideo')  as HTMLVideoElement;
    this.canvasEl = document.getElementById('scanCanvas') as HTMLCanvasElement;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }
      });
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.startAutoDetect();
    } catch {
      this.scanStatus  = 'error';
      this.scanMessage = 'Camera access denied. Please allow camera permission.';
    }
  }

  // ── AUTO DETECT LOOP ─────────────────────────────────────
  private startAutoDetect(): void {
    this.lastCentroid = null;
  
    this.autoScanTimer = setTimeout(() => {
      if (this.scanStatus === 'detecting') {
        this.showManualCapture = true;
        this.scanMessage = 'Hold the label steady or tap capture';
      }
    }, this.MAX_ATTEMPTS * 800);
  
    const attempt = async () => {
      if (this.scanStatus !== 'detecting' || this.isProcessing) return;
  
      const confidence = this.detectLabel();
  
      if (confidence >= this.CONFIDENCE_THRESHOLD) {
        // Label detected with sufficient confidence — capture and OCR
        this.isProcessing = true;
        this.scanStatus   = 'scanning';
        this.scanMessage  = 'Label detected — reading…';
        this.scanProgress = 0;
        const ctx = this.canvasEl.getContext('2d')!;
        this.canvasEl.width  = this.videoEl.videoWidth;
        this.canvasEl.height = this.videoEl.videoHeight;
        ctx.drawImage(this.videoEl, 0, 0); // full res captured

        this.stopStream(); // now safe to stop
        await this.runOcrAttempt(); // canvas already has full frame
      } else {
        // Not confident enough — keep looping
        if (this.scanStatus === 'detecting') {
          this.autoScanLoop = setTimeout(attempt, 800);
        }
      }
    };
  
    // 1.5s initial delay — let camera open, focus, and expose properly
    this.autoScanLoop = setTimeout(attempt, 1500);
  }


  private detectLabel(): number {
    if (!this.videoEl || !this.canvasEl) return 0;
    if (this.videoEl.readyState < 2)     return 0;
  
    // Work on a small downscaled frame for speed (~5ms on mobile)
    const W = 320, H = 240;
    const ctx = this.canvasEl.getContext('2d')!;
    this.canvasEl.width  = W;
    this.canvasEl.height = H;
    ctx.drawImage(this.videoEl, 0, 0, W, H);
  
    const { data } = ctx.getImageData(0, 0, W, H);
  
    // Build greyscale + brightness maps
    const grey  = new Uint8Array(W * H);
    const white = new Uint8Array(W * H); // 1 if pixel is "white"
  
    const WHITE_MIN = 200; // pixel brightness > this = white
  
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const g8 = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
      grey[i >> 2]  = g8;
      white[i >> 2] = g8 > WHITE_MIN ? 1 : 0;
    }
  
    // ── Score 1: White region density ────────────────────────────────────
    // A label sticker = dense band of white pixels occupying 15-70% of frame
    let whiteCount = 0;
    for (let i = 0; i < white.length; i++) whiteCount += white[i];
    const whiteFraction = whiteCount / (W * H);
  
    // Too little white = no sticker visible
    // Too much white = pointing at a white wall/sky, not a label
    if (whiteFraction < 0.12 || whiteFraction > 0.75) return 0;
  
    // ── Score 2: White region is RECTANGULAR (not scattered) ─────────────
    // Row and column projections — a rectangle has a contiguous dense band
    const rowDensity = new Float32Array(H);
    const colDensity = new Float32Array(W);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (white[y * W + x]) { rowDensity[y]++; colDensity[x]++; }
      }
  
    // Find the densest contiguous row band
    const rowThresh = W * 0.25; // row must be 35% white to count
    const colThresh = H * 0.20;
  
    let denseRows = 0, denseCols = 0;
    for (let y = 0; y < H; y++) if (rowDensity[y] > rowThresh) denseRows++;
    for (let x = 0; x < W; x++) if (colDensity[x] > colThresh) denseCols++;
  
    // Rectangle score: dense rows and cols must both exist
    const rectScore = Math.min(denseRows / H, denseCols / W);
    if (rectScore < 0.10) return 0; // no clear rectangle
  
    // ── Score 3: Text inside the white region (pixel variance) ───────────
    // A blank white wall has near-zero variance. A label with printed text
    // has high variance because dark characters sit on white background.
    let sum = 0, sumSq = 0, textPixels = 0;
    for (let i = 0; i < grey.length; i++) {
      // Only sample pixels that are "near white" (inside the sticker region)
      if (grey[i] > 160) {
        sum   += grey[i];
        sumSq += grey[i] * grey[i];
        textPixels++;
      }
    }
    const mean     = sum / (textPixels || 1);
    const variance = sumSq / (textPixels || 1) - mean * mean;
  
    // Low variance = blank white surface (no text)
    // High variance inside white region = printed text present
    const textScore = Math.min(variance / 300, 1.0); // normalise to 0-1
    if (textScore < 0.15) return 0; // no text detected
  
    // ── Score 4: Stability check ──────────────────────────────────────────
    // Compare this frame's white centroid to last frame's.
    // If centroid moved a lot = phone is still moving.
    let cx = 0, cy = 0, wc = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (white[y * W + x]) { cx += x; cy += y; wc++; }
  
    if (wc > 0) { cx /= wc; cy /= wc; }
  
    const moved = this.lastCentroid
      ? Math.sqrt((cx - this.lastCentroid.x) ** 2 + (cy - this.lastCentroid.y) ** 2)
      : 999;
    this.lastCentroid = { x: cx, y: cy };
  
    // If centroid moved more than 15px between frames = still moving
    const stabilityScore = moved < 15 ? 1.0 : Math.max(0, 1 - (moved - 15) / 50);
  
    // ── Combined confidence ───────────────────────────────────────────────
    // Weight: rect shape 30%, text presence 40%, stability 30%
    const stabilityWeight = this.lastCentroid ? 0.20 : 0.0; // ignore stability on first frame
    const baseScore = rectScore * 0.35 + textScore * 0.65;
    const confidence = this.lastCentroid
      ? rectScore * 0.35 + textScore * 0.45 + stabilityScore * 0.20
      : baseScore;
  
    console.log(`[LabelDetect] white=${whiteFraction.toFixed(2)} rect=${rectScore.toFixed(2)} text=${textScore.toFixed(2)} stability=${stabilityScore.toFixed(2)} → ${confidence.toFixed(2)}`);
  
    return confidence;
  }

  // ── SINGLE OCR ATTEMPT ───────────────────────────────────
  private async runOcrAttempt(): Promise<void> {
    const progressInterval = setInterval(() => {
      if (this.scanProgress < 85) this.scanProgress += 3;
    }, 600);

    const imageData = this.canvasEl.toDataURL('image/jpeg', 0.92);

    try {
      const result = await this.labelScanner.scanLabel(imageData);
      const filledCount = this.countFilledFields(result);

      clearInterval(progressInterval);
      this.scanProgress = 100;

      if (filledCount >= this.MIN_FIELDS_REQUIRED) {
        this.applyScannedData(result);
        this.scanStatus  = 'success';
        this.scanMessage = this.buildSuccessMessage(result);
        setTimeout(() => { this.showScanner = false; }, 2000);
      } else {
        // Got a response but not enough fields — show retry
        this.scanStatus  = 'error';
        this.scanMessage = 'Label unclear — try better lighting or tap retry';
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      if (err?.status === 403) {
        this.scanStatus  = 'error';
        this.scanMessage = 'Session expired — please log in again';
      } else if (err?.name === 'TimeoutError') {
        this.scanStatus  = 'error';
        this.scanMessage = 'Server took too long — please try again';
      } else {
        this.scanStatus  = 'error';
        this.scanMessage = 'Could not read label. Try better lighting.';
      }
    }

    this.isProcessing = false;
  }

  // ── MANUAL CAPTURE (fallback shutter) ───────────────────
  async manualCapture(): Promise<void> {
    if (this.isProcessing) return;
    this.stopAutoDetect();

    const ctx = this.canvasEl.getContext('2d')!;
    this.canvasEl.width  = this.videoEl.videoWidth;
    this.canvasEl.height = this.videoEl.videoHeight;
    ctx.drawImage(this.videoEl, 0, 0);

    this.stopStream();
    this.scanStatus        = 'scanning';
    this.scanMessage       = 'Reading label…';
    this.scanProgress      = 0;
    this.showManualCapture = false;
    this.isProcessing      = true;

    await this.runOcrAttempt();
  }

  // ── HELPERS ──────────────────────────────────────────────
  private countFilledFields(data: ScannedLabelData): number {
    let count = 0;
    if (data.batchNo)     count++;
    if (data.expiryDate)  count++;
    if (data.mrp != null) count++;
    return count;
  }

  private applyScannedData(data: ScannedLabelData): void {
    const patch: any = {};
    if (data.batchNo)     patch.batchNo    = data.batchNo;
    if (data.expiryDate)  patch.expiryDate = data.expiryDate;
    if (data.mrp != null) patch.mrp        = data.mrp;
    this.productForm.patchValue(patch);
  }

  private buildSuccessMessage(data: ScannedLabelData): string {
    const found: string[] = [];
    if (data.batchNo)     found.push('Batch No');
    if (data.expiryDate)  found.push('Expiry Date');
    if (data.mrp != null) found.push('MRP');
    return found.length > 0
      ? `✓ Filled: ${found.join(', ')}`
      : 'Scan done — please fill fields manually.';
  }

  private stopAutoDetect(): void {
    clearTimeout(this.autoScanLoop);
    clearTimeout(this.autoScanTimer);
    this.autoScanLoop  = null;
    this.autoScanTimer = null;
  }

  stopStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  closeScanner(): void {
    this.stopAutoDetect();
    this.stopStream();
    this.showScanner       = false;
    this.scanStatus        = 'idle';
    this.scanMessage       = '';
    this.scanProgress      = 0;
    this.showManualCapture = false;
  }

  ngOnDestroy(): void {
    this.stopAutoDetect();
    this.stopStream();
  }
}
