import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faArrowLeft, faPrint } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-bill-preview',
  templateUrl: './bill-preview.component.html',
  styleUrls: ['./bill-preview.component.scss']
})
export class BillPreviewComponent implements OnInit {
  userId!: any;
  billId!: any;
  details: any = {};
  bill: any = {};
  totalAmountInWords: string = '';
  logoUrl: string = 'assets/images/GST_Logo.jpeg';
  
  faArrowLeft = faArrowLeft;
  faPrint = faPrint;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
  ) {}

  getIdentificationLabel(value: string): string {
    if (!value) return 'GSTIN';
    
    if (/^[0-9]{12}$/.test(value)) {
      return 'Aadhaar';
    }
    
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value)) {
      return 'PAN';
    }
    
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
      if (tempNum > 0) {
        result += ones[tempNum];
      }
    }
    return result.trim();
  }

  convertNumberToWords(value: number): string {
    const number = Math.round(value * 100) / 100;
    const ones: string[] = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'
    ];

    const teens: string[] = [
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];

    const tens: string[] = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    if (number === 0) {
      return 'Zero';
    }

    let integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);

    const crore = Math.floor(integerPart / 10000000);
    integerPart %= 10000000;

    const lakh = Math.floor(integerPart / 100000);
    integerPart %= 100000;

    const thousand = Math.floor(integerPart / 1000);
    integerPart %= 1000;

    let hundreds = integerPart;

    let result = '';

    if (crore > 0) {
      result += this.convertHundreds(crore, ones, teens, tens) + ' Crore ';
    }

    if (lakh > 0) {
      result += this.convertHundreds(lakh, ones, teens, tens) + ' Lakh ';
    }

    if (thousand > 0) {
      result += this.convertHundreds(thousand, ones, teens, tens) + ' Thousand ';
    }

    if (hundreds > 0) {
      result += this.convertHundreds(hundreds, ones, teens, tens);
    }

    if (decimalPart > 0) {
      result += ' and ' + this.convertHundreds(decimalPart, ones, teens, tens) + ' Paise';
    }

    return result.trim();
  }

  printInvoice() {
    window.print();
  }

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.billId = this.userStorageService.getBillId();
    
    this.authService.getDetailsByUserId(this.userId).subscribe(
      (response: any) => {
        this.details = response;
        // Use uploaded logo if available, otherwise use default
        this.logoUrl = response.logoUrl || 'assets/images/default-gst-medicose.png';
        console.log('Business details loaded:', this.details);
        console.log('Logo URL:', this.logoUrl);
      },
      (error) => {
        console.error('Error loading business details:', error);

      }
    );

    this.authService.getBillById(this.billId).subscribe(
      (response: any) => {
        this.bill = response;
        console.log('Bill loaded:', this.bill);
        this.totalAmountInWords = this.convertNumberToWords(this.bill.totalAmount);
      },
      (error) => {
        console.error('Error loading bill:', error);
      }
    );
  }
}