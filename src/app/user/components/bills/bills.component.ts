import { Component,OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';

@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.css']
})
export class BillsComponent implements OnInit{
  bills: any;
  userId!: any;
  billId!: any;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.getBills(this.userId);
  }

  getBills(userId:any) {
    this.authService.getBills(userId).subscribe((data) => {
      this.bills = data;
      console.log(data);
    });
  }

  openBill(billId:any){
    this.userStorageService.saveBillId(billId);
    this.router.navigate(['user/bill-preview']);
  }
}
