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

  convertNumberToWords(value: number): string {
    const number = Math.round(value * 100) / 100;
    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'
    ];
  
    const teens = [
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
  
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];
  
    if (number === 0) {
      return 'Zero';
    }
  
    // Handle the integer part
    const integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);
  
    const crore = Math.floor(integerPart / 10000000);
    const lakh = Math.floor((integerPart % 10000000) / 100000);
    const thousand = Math.floor((integerPart % 100000) / 1000);
    let hundreds = integerPart % 1000;
  
    let result = '';
  
    if (crore > 0) {
      result += ones[crore] + ' Crore ';
    }
  
    if (lakh > 0) {
      result += ones[lakh] + ' Lakh ';
    }
  
    if (thousand > 0) {
      result += ones[thousand] + ' Thousand ';
    }
  
    if (hundreds > 0) {
      if (hundreds >= 100) {
        result += ones[Math.floor(hundreds / 100)] + ' Hundred ';
        hundreds %= 100;
      }
  
      if (hundreds >= 10 && hundreds <= 19) {
        result += teens[hundreds - 10];
      } else {
        if (hundreds >= 20) {
          result += tens[Math.floor(hundreds / 10)] + ' ';
          hundreds %= 10;
        }
  
        if (hundreds > 0) {
          result += ones[hundreds];
        }
      }
    }
  
    // Handle the decimal part
    if (decimalPart > 0) {
      result += ' and ' + tens[Math.floor(decimalPart / 10)] + ' ' + ones[decimalPart % 10] + ' Paise';
    }
  
    return result.trim();
  }
  
  printInvoice() {
    let printElement = document.getElementById('print-section');
    if (printElement) {
      let printContents = printElement.innerHTML;
      let originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
    } else {
      console.error('Element with id "print-section" not found');
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
