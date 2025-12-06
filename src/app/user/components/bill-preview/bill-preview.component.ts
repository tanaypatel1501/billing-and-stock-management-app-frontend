import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-bill-preview',
  templateUrl: './bill-preview.component.html',
  styleUrls: ['./bill-preview.component.css']
})
export class BillPreviewComponent implements OnInit{
  userId!: any;
  billId!: any;
  details : any = {};
  bill : any = {};
  totalAmountInWords: string = '';
  

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router,
  ) {}

  // Helper function to handle numbers 1-999
  // The parameters now correctly accept string arrays as input
  private convertHundreds(num: number, ones: string[], teens: string[], tens: string[]): string {
    let result = '';
    let tempNum = num;

    if (tempNum >= 100) {
      // Accessing array element using index, results in a single string
      result += ones[Math.floor(tempNum / 100)] + ' Hundred ';
      tempNum %= 100;
    }

    if (tempNum >= 10 && tempNum <= 19) {
      result += teens[tempNum - 10];
    } else {
      if (tempNum >= 20) {
        // Accessing array element using index, results in a single string
        result += tens[Math.floor(tempNum / 10)] + ' ';
        tempNum %= 10;
      }
      if (tempNum > 0) {
         // Accessing array element using index, results in a single string
        result += ones[tempNum];
      }
    }
    return result.trim();
  }
  
  convertNumberToWords(value: number): string {
    const number = Math.round(value * 100) / 100;
    const ones: string[] = [ // Added type annotation
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'
    ];
  
    const teens: string[] = [ // Added type annotation
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
  
    const tens: string[] = [ // Added type annotation
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];
  
    if (number === 0) {
      return 'Zero';
    }
  
    // Handle the integer part
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
      // Pass the arrays correctly to the helper function
      result += this.convertHundreds(crore, ones, teens, tens) + ' Crore ';
    }
  
    if (lakh > 0) {
      // Pass the arrays correctly to the helper function
      result += this.convertHundreds(lakh, ones, teens, tens) + ' Lakh ';
    }
  
    if (thousand > 0) {
      // Pass the arrays correctly to the helper function
      result += this.convertHundreds(thousand, ones, teens, tens) + ' Thousand ';
    }
  
    if (hundreds > 0) {
      // Pass the arrays correctly to the helper function
      result += this.convertHundreds(hundreds, ones, teens, tens);
    }
  
    // Handle the decimal part
    if (decimalPart > 0) {
      result += ' and ' + this.convertHundreds(decimalPart, ones, teens, tens) + ' Paise';
    }
  
    return result.trim();
  }
  
  printInvoice() {
    const printElement = document.getElementById('print-section');
    if (!printElement) {
      console.error('Element with id "print-section" not found');
      return;
    }
    // Create an offscreen iframe and write the printable content into it.
    // This preserves the main DOM (so Angular bindings/events remain intact)
    // and keeps the same-tab behaviour while allowing styles/fonts to be applied.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.id = 'print-iframe';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Unable to access iframe document for printing');
      try { document.body.removeChild(iframe); } catch (e) { /* ignore */ }
      return;
    }

    // Copy only stylesheet and style tags from the main document head so
    // printed content uses the same fonts and CSS rules.
    const headNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
    const headHtml = headNodes.map(n => n.outerHTML).join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          ${headHtml}
          <meta charset="utf-8" />
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait a tick to ensure fonts/styles are applied, then call print on iframe
    const win = iframe.contentWindow as Window | null;
    if (win) {
      win.focus();
      // Use a short timeout to allow fonts to load in the iframe
      setTimeout(() => {
        try {
          win.print();
        } catch (e) {
          console.error('Print failed on iframe', e);
        }
        // Clean up the iframe after a short delay
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch (e) { /* ignore */ }
        }, 500);
      }, 250);
    } else {
      // Fallback: remove iframe
      try { document.body.removeChild(iframe); } catch (e) { /* ignore */ }
    }
  }
  

  ngOnInit(): void {
    this.userId = UserStorageService.getUserId();
    this.billId = this.userStorageService.getBillId();
    this.authService.getDetailsByUserId(this.userId).subscribe(
      (response: any) => {
        this.details = response; 
        console.log(this.details)
      },
      (error) => {
        console.log(error);
        // Handle error if necessary
      }
    );

    this.authService.getBillById(this.billId).subscribe(
      (response: any) =>{
        this.bill = response;
        console.log(this.bill)
        this.totalAmountInWords = this.convertNumberToWords(this.bill.totalAmount);
      },
      (error) => {
        console.log(error);
        // Handle error if necessary
      }
    )
  }
}
