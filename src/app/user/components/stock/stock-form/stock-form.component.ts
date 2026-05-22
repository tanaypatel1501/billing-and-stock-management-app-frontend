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
  private readonly MAX_ATTEMPTS       = 12;   // ~10s at one attempt per ~800ms
  private readonly SHARPNESS_THRESHOLD = 180; // tune if needed (higher = stricter)
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
    // Show manual capture button after ~10s regardless
    this.autoScanTimer = setTimeout(() => {
      if (this.scanStatus === 'detecting') {
        this.showManualCapture = true;
        this.scanMessage = 'Hold the label steady or tap capture';
      }
    }, this.MAX_ATTEMPTS * 800);

    const attempt = async () => {
      if (this.scanStatus !== 'detecting' || this.isProcessing) return;

      // Check sharpness before OCR — cheap canvas operation
      const sharpness = this.measureSharpness();
      if (sharpness >= this.SHARPNESS_THRESHOLD) {
        this.attemptCount++;
        this.isProcessing = true;

        // Show scanning state in UI immediately — don't leave user wondering
        this.scanStatus  = 'scanning';
        this.scanMessage = 'Reading label…';
        this.scanProgress = 0;
        this.stopStream(); // stop camera — frame is captured

        await this.runOcrAttempt();
        // runOcrAttempt sets status to success/error, no need to reset isProcessing
      } else {
        // Not sharp enough — keep looping
        if (this.scanStatus === 'detecting') {
          this.autoScanLoop = setTimeout(attempt, 800);
        }
      }
    };

    // Small initial delay to let camera warm up / focus
    this.autoScanLoop = setTimeout(attempt, 1200);
  }

  // ── SHARPNESS CHECK (Laplacian variance on greyscale) ────
  private measureSharpness(): number {
    if (!this.videoEl || !this.canvasEl) return 0;
    if (this.videoEl.readyState < 2) return 0;

    // Use a small 200×150 sample for speed
    const sampleW = 200, sampleH = 150;
    const ctx = this.canvasEl.getContext('2d')!;
    this.canvasEl.width  = sampleW;
    this.canvasEl.height = sampleH;
    ctx.drawImage(this.videoEl, 0, 0, sampleW, sampleH);

    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
    const grey: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      grey.push(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
    }

    // Laplacian: measure how much edges exist (blurry = low variance)
    let sum = 0, sumSq = 0, count = 0;
    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const idx = y * sampleW + x;
        const lap = Math.abs(
          -grey[idx - sampleW - 1] - grey[idx - sampleW] - grey[idx - sampleW + 1]
          - grey[idx - 1] + 8 * grey[idx] - grey[idx + 1]
          - grey[idx + sampleW - 1] - grey[idx + sampleW] - grey[idx + sampleW + 1]
        );
        sum   += lap;
        sumSq += lap * lap;
        count++;
      }
    }
    const mean     = sum / count;
    const variance = sumSq / count - mean * mean;
    return variance;
  }

  // ── SINGLE OCR ATTEMPT ───────────────────────────────────
  private async runOcrAttempt(): Promise<void> {
    const progressInterval = setInterval(() => {
      if (this.scanProgress < 85) this.scanProgress += 3;
    }, 600);

    const ctx = this.canvasEl.getContext('2d')!;
    this.canvasEl.width  = this.videoEl.videoWidth  || this.canvasEl.width;
    this.canvasEl.height = this.videoEl.videoHeight || this.canvasEl.height;
    // Don't redraw if stream already stopped — canvas still has the last frame
    if (this.videoEl.readyState >= 2) {
      ctx.drawImage(this.videoEl, 0, 0);
    }

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
