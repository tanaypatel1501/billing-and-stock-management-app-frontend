import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faArrowLeft, faPrint, faDownload, faShare, faTimes, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  pdfBlobUrl: string | null = null;
  safePdfUrl: SafeResourceUrl | null = null;
  pdfBlob: Blob | null = null;
  showShareSheet = false;
  private logoBlobUrl: string | null = null;

  faArrowLeft = faArrowLeft;
  faPrint = faPrint;
  faDownload = faDownload;
  faShare = faShare;
  faTimes = faTimes;
  faEnvelope = faEnvelope;
  faWhatsapp = faWhatsapp;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
    private datePipe: DatePipe,
    private sanitizer: DomSanitizer
  ) {}

  // ── PDF Modal ──

  openPdfPreview(): void {
    this.showPdfModal = true;
    this.pdfLoading = true;
    this.pdfError = false;

    this.authService.getPdfBlob(this.billId).subscribe({
      next: (blob: Blob) => {
        this.pdfBlob = blob;
        const url = URL.createObjectURL(blob);
        this.pdfBlobUrl = url;
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.pdfLoading = false;
      },
      error: (err) => {
        console.error('PDF generation failed:', err);
        this.pdfLoading = false;
        this.pdfError = true;
      }
    });
  }

  closePdfModal(): void {
    this.showPdfModal = false;
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
      this.safePdfUrl = null;
      this.pdfBlob = null;
    }
  }

  downloadPdf(): void {
    if (!this.pdfBlob) return;
    const url = URL.createObjectURL(this.pdfBlob);
    const a = document.createElement('a');
    const date = this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy');
    a.href = url;
    a.download = `Invoice-${this.bill.purchaserName}-${date}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openShareSheet(): void {
    if (!this.pdfBlob) return;
    this.showShareSheet = true;
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
    // Opens mail client — user attaches the PDF manually after download
    this.downloadPdf();
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.closeShareSheet();
  }

  shareViaWhatsApp(): void {
    const date = this.datePipe.transform(this.bill.invoiceDate, 'dd-MM-yyyy');
    const fileName = `Invoice-${this.bill.purchaserName}-${date}.pdf`;
    const file = new File([this.pdfBlob!], fileName, { type: 'application/pdf' });

    // Use Web Share API for file attachment — WhatsApp picks it up on mobile
    if (navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: `Invoice - ${this.bill.purchaserName}`,
        text: `Invoice dated ${date} from ${this.details.name}`
      }).catch(err => console.error('WhatsApp share failed:', err));
    } else {
      // Fallback: open WhatsApp web with a pre-filled message + trigger download
      this.downloadPdf();
      const text = encodeURIComponent(
        `Invoice for ${this.bill.purchaserName} dated ${date} from ${this.details.name}. Please find the attached PDF.`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
    this.closeShareSheet();
  }

  printPdf(): void {
    if (!this.pdfBlobUrl) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      window.open(this.pdfBlobUrl, '_blank');
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = this.pdfBlobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      };
    }
  }

  ngOnDestroy(): void {
    this.closePdfModal();
      if (this.logoBlobUrl) {
      URL.revokeObjectURL(this.logoBlobUrl);
      this.logoBlobUrl = null;
    }
  }

  // ── Existing methods ──

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

  private buildQrIfReady(): void {
    if (this.details?.upiId && this.details?.showQrOnBill && this.bill?.totalAmount) {
      const rounded = Math.round(this.bill.totalAmount * 100) / 100;
      this.upiQrData = `upi://pay?pa=${this.details.upiId}&pn=${encodeURIComponent(this.details.name)}&am=${rounded.toFixed(2)}&cu=INR`;
    }
  }
}