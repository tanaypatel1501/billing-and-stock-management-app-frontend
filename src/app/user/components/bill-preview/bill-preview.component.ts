import { Component, OnInit, OnDestroy, ElementRef, ViewChild  } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faArrowLeft, faPrint, faDownload, faShare, faTimes, faEnvelope, faRotateLeft, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { DatePipe } from '@angular/common';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';
import { InvoiceData } from 'src/app/models/invoice-data.model';
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import panzoom, { PanZoom } from 'panzoom';
import { NativeDockService } from 'src/app/services/native-dock/native-dock.service';
import { NativePrintService } from 'src/app/services/native-print/native-print.service';

GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.js';

@Component({
  selector: 'app-bill-preview',
  templateUrl: './bill-preview.component.html',
  providers: [DatePipe],
  styleUrls: ['./bill-preview.component.scss']
})
export class BillPreviewComponent implements OnInit, OnDestroy {
  userId!: any;
  billId!: any;
  details: any = {};
  bill: any = {};
  totalAmountInWords: string = '';
  upiQrData: string = '';
  logoUrl: string = '';

  // PDF modal state
  showPdfModal = false;
  pdfLoading = false;
  pdfError = false;
  pdfBlob: Blob | null = null;

  private pdfDocument: PDFDocumentProxy | null = null;

  @ViewChild('pdfViewer')
  pdfViewer?: ElementRef<HTMLDivElement>;

  showShareSheet = false;
  private logoBlobUrl: string | null = null;
  private panzoomInstance: PanZoom | null = null;

  faArrowLeft = faArrowLeft;
  faPrint = faPrint;
  faDownload = faDownload;
  faShare = faShare;
  faTimes = faTimes;
  faEnvelope = faEnvelope;
  faWhatsapp = faWhatsapp;
  faRotateLeft = faRotateLeft;
  faChevronLeft = faChevronLeft;
  isAndroid = Capacitor.getPlatform() === 'android';
  private dockRelease: (() => void) | null = null;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private datePipe: DatePipe,
    private alertService: AlertService,
    private nativeDock: NativeDockService,
    private nativePrint: NativePrintService
  ) {}

  // ── PDF Modal ──

  private async renderPdf(blob: Blob): Promise<void> {
    if (!this.pdfViewer?.nativeElement) {
      throw new Error('PDF viewer container is not available.');
    }

    // Clean up any previous PDF
    if (this.pdfDocument) {
      await this.pdfDocument.destroy();
      this.pdfDocument = null;
    }

    const container = this.pdfViewer.nativeElement;

    // Remove previous pages
    container.innerHTML = '';

    const arrayBuffer = await blob.arrayBuffer();

    const loadingTask = getDocument({
      data: new Uint8Array(arrayBuffer)
    });

    this.pdfDocument = await loadingTask.promise;

    for (let pageNumber = 1; pageNumber <= this.pdfDocument.numPages; pageNumber++) {
      const page = await this.pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });

      const availableWidth = Math.max(container.clientWidth - 20, 280);
      const fitScale = availableWidth / baseViewport.width;

      const ZOOM_HEADROOM = 2;
      const MAX_PIXELS = 5000000;                                   // per page
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let renderScale = fitScale * ZOOM_HEADROOM * devicePixelRatio;
      const pixels = baseViewport.width * renderScale * baseViewport.height * renderScale;
      if (pixels > MAX_PIXELS) {
        renderScale *= Math.sqrt(MAX_PIXELS / pixels);
      }

      const displayViewport = page.getViewport({ scale: fitScale });
      const renderViewport = page.getViewport({ scale: renderScale });

      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page';

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not create PDF canvas context.');
      }

      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);

      canvas.style.width = `${Math.ceil(displayViewport.width)}px`;
      canvas.style.height = `${Math.ceil(displayViewport.height)}px`;

      pageWrapper.appendChild(canvas);
      container.appendChild(pageWrapper);

      await page.render({
        canvasContext: context,
        viewport: renderViewport
      }).promise;
    }

    if (this.panzoomInstance) {
      this.panzoomInstance.dispose();
    }
    this.panzoomInstance = panzoom(container, {
      maxZoom: 3,
      minZoom: 1,
      bounds: true,
      boundsPadding: 0.1
    });
  }

  async openPdfPreview(): Promise<void> {
    this.showPdfModal = true;
    this.hideDock();
    this.pdfLoading = true;
    this.pdfError = false;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        this.authService.getPdfBlob(this.billId).subscribe({
          next: resolve,
          error: reject
        });
      });

      this.pdfBlob = blob;

      await this.renderPdf(blob);
      this.pdfLoading = false;
    } catch (error) {
      console.error('PDF generation failed:', error);
      this.pdfLoading = false;
      this.pdfError = true;
    }
  }

  async closePdfModal(): Promise<void> {
    this.showPdfModal = false;
    this.showShareSheet = false;
    this.restoreDock();

    if (this.panzoomInstance) {
      this.panzoomInstance.dispose();
      this.panzoomInstance = null;
    }

    if (this.pdfDocument) {
      try {
        await this.pdfDocument.destroy();
      } catch (error) {
        console.warn('Failed to destroy PDF document:', error);
      }
      this.pdfDocument = null;
    }

    this.pdfBlob = null;
    this.freePdfCanvases();
  }

  private hideDock(): void {
    if (!this.dockRelease) this.dockRelease = this.nativeDock.suppress();
  }

  private restoreDock(): void {
    this.dockRelease?.();
    this.dockRelease = null;
  }

  private freePdfCanvases(): void {
    const el = this.pdfViewer?.nativeElement;
    if (!el) return;
    el.querySelectorAll('canvas').forEach(c => {
      (c as HTMLCanvasElement).width = 0;     // releases the canvas memory immediately
      (c as HTMLCanvasElement).height = 0;
    });
    el.innerHTML = '';
  }

  /* ---------------------- NATIVE FILE HELPERS ---------------------- */

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async writePdfToDevice(blob: Blob, filename: string): Promise<{ uri: string; location: 'Documents' | 'App storage' }> {
    const base64Data = await this.blobToBase64(blob);

    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });
      return { uri: result.uri, location: 'Documents' };
    } catch (err) {
      console.warn('Write to Documents failed, falling back to app storage:', err);
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.External,
        recursive: true
      });
      return { uri: result.uri, location: 'App storage' };
    }
  }

  private buildFilename(): string {
    const date = this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy');
    return `Invoice-${this.bill.purchaserName}-${date}.pdf`;
  }

  /* ---------------------- DOWNLOAD ---------------------- */

  downloadPdf(): void {
    if (!this.pdfBlob) return;
    const filename = this.buildFilename();

    if (Capacitor.isNativePlatform()) {
      this.writePdfToDevice(this.pdfBlob, filename)
        .then(({ location }) => {
          this.alertService.success(`Invoice saved to ${location}.`);
        })
        .catch((err) => {
          console.error('Native download failed:', err);
          this.alertService.error('Failed to save invoice.');
        });
      return;
    }

    // Web: unchanged
    const url = URL.createObjectURL(this.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------------- SHARE ---------------------- */

  openShareSheet(): void {
    if (!this.pdfBlob) return;

    if (Capacitor.isNativePlatform()) {
      this.shareNative();
      return;
    }

    this.showShareSheet = true;
  }

  private async shareNative(): Promise<void> {
    if (!this.pdfBlob) return;
    const filename = this.buildFilename();

    try {
      const { uri } = await this.writePdfToDevice(this.pdfBlob, filename);
      await Share.share({
        title: `Invoice - ${this.bill.purchaserName}`,
        text: `Invoice dated ${this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy')} from ${this.details.name}`,
        url: uri,
        dialogTitle: 'Share Invoice'
      });
    } catch (err: any) {
      if (err?.message !== 'Share canceled') {
        console.error('Native share failed:', err);
        this.alertService.error('Failed to share invoice.');
      }
    }
  }

  closeShareSheet(): void {
    this.showShareSheet = false;
  }

  shareViaEmail(): void {
    const date = this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy');
    const subject = encodeURIComponent(`Invoice - ${this.bill.purchaserName} - ${date}`);
    const body = encodeURIComponent(
      `Please find attached the invoice for ${this.bill.purchaserName} dated ${date}.\n\nRegards,\n${this.details.name}`
    );
    this.downloadPdf();
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.closeShareSheet();
  }

  shareViaWhatsApp(): void {
    const date = this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy');
    const fileName = this.buildFilename();
    const file = new File([this.pdfBlob!], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: `Invoice - ${this.bill.purchaserName}`,
        text: `Invoice dated ${date} from ${this.details.name}`
      }).catch(err => console.error('WhatsApp share failed:', err));
    } else {
      this.downloadPdf();
      const text = encodeURIComponent(
        `Invoice for ${this.bill.purchaserName} dated ${date} from ${this.details.name}. Please find the attached PDF.`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
    this.closeShareSheet();
  }

  async printPdf(): Promise<void> {
    if (!this.pdfBlob) return;

    // Android app: open the system print screen (preview, printers, Save as PDF)
    if (this.isAndroid) {
      try {
        await this.nativePrint.printPdf(
          this.pdfBlob,
          this.buildFilename().replace(/\.pdf$/i, '')
        );
      } catch (err) {
        console.error('Native print failed:', err);
        this.alertService.error('Could not open the print screen.');
      }
      return;
    }

    // Web: unchanged
    const pdfUrl = URL.createObjectURL(this.pdfBlob);

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;

    if (isIOS) {
      window.open(pdfUrl, '_blank');
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 10000);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 300);
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    };
  }

  ngOnDestroy(): void {
    this.restoreDock();
    if (this.panzoomInstance) {
      this.panzoomInstance.dispose();
      this.panzoomInstance = null;
    }
    if (this.pdfDocument) {
      this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
    this.pdfBlob = null;
    if (this.pdfViewer?.nativeElement) {
      this.pdfViewer.nativeElement.innerHTML = '';
    }
    if (this.logoBlobUrl) {
      URL.revokeObjectURL(this.logoBlobUrl);
      this.logoBlobUrl = null;
    }
  }

  // ── Existing methods (unchanged) ──

  getIdentificationLabel(value: string): string {
    if (!value) return 'GSTIN';
    if (/^[0-9]{12}$/.test(value)) return 'Aadhaar';
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value)) return 'PAN';
    return 'GSTIN';
  }

  private convertHundreds(num: number, ones: string[], teens: string[], tens: string[]): string {
    let result = '';
    let tempNum = num;
    if (tempNum >= 100) {
      result += ones[Math.floor(tempNum / 100)] + ' Hundred ';
      tempNum %= 100;
    }
    if (tempNum >= 10 && tempNum <= 19) {
      result += teens[tempNum - 10];
    } else {
      if (tempNum >= 20) {
        result += tens[Math.floor(tempNum / 10)] + ' ';
        tempNum %= 10;
      }
      if (tempNum > 0) result += ones[tempNum];
    }
    return result.trim();
  }

  convertNumberToWords(value: number): string {
    const number = Math.round(value * 100) / 100;
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (number === 0) return 'Zero';
    let integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);
    const crore = Math.floor(integerPart / 10000000); integerPart %= 10000000;
    const lakh = Math.floor(integerPart / 100000); integerPart %= 100000;
    const thousand = Math.floor(integerPart / 1000); integerPart %= 1000;
    const hundreds = integerPart;
    let result = '';
    if (crore > 0) result += this.convertHundreds(crore, ones, teens, tens) + ' Crore ';
    if (lakh > 0) result += this.convertHundreds(lakh, ones, teens, tens) + ' Lakh ';
    if (thousand > 0) result += this.convertHundreds(thousand, ones, teens, tens) + ' Thousand ';
    if (hundreds > 0) result += this.convertHundreds(hundreds, ones, teens, tens);
    if (decimalPart > 0) result += ' and ' + this.convertHundreds(decimalPart, ones, teens, tens) + ' Paise';
    return result.trim();
  }

  printInvoice(): void {
    const originalTitle = document.title;
    const date = this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy');
    document.title = `${this.bill.purchaserName} - ${date} - GST Medicose`;
    window.print();
    document.title = originalTitle;
  }

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.billId = this.userStorageService.getBillId();

    this.authService.getDetailsByUserId(this.userId).subscribe(
      (response: any) => {
        this.details = response;
        this.authService.getLogoUrl(this.userId).subscribe(url => {
          if (this.logoBlobUrl) URL.revokeObjectURL(this.logoBlobUrl);
          this.logoBlobUrl = url.startsWith('blob:') ? url : null;
          this.logoUrl = url;
        });
        this.buildQrIfReady();
      },
      (error) => console.error('Error loading business details:', error)
    );

    this.authService.getBillById(this.billId).subscribe(
      (response: any) => {
        this.bill = response;
        this.totalAmountInWords = this.convertNumberToWords(Math.round(this.bill.totalAmount * 100) / 100);
        this.buildQrIfReady();
      },
      (error) => console.error('Error loading bill:', error)
    );
  }
  get invoiceData(): InvoiceData {
    return {
      bill: this.bill,
      details: this.details,
      totalAmountInWords: this.totalAmountInWords,
      upiQrData: this.upiQrData,
      logoUrl: this.logoUrl
    };
  }

  private buildQrIfReady(): void {
    if (this.details?.upiId && this.details?.showQrOnBill && this.bill?.totalAmount) {
      const rounded = Math.round(this.bill.totalAmount * 100) / 100;
      this.upiQrData = `upi://pay?pa=${this.details.upiId}&pn=${encodeURIComponent(this.details.name)}&am=${rounded.toFixed(2)}&cu=INR`;
    }
  }
}