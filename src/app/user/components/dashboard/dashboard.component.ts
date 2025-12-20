import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth-service/auth.service';
import { Router } from '@angular/router';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { faTrashCan } from '@fortawesome/free-regular-svg-icons';
import { faPencil } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit{
  faTrashCan = faTrashCan;
  faPencil = faPencil;
  stock: any;
  userId!: any;

  constructor(
    private authService: AuthService,
    private userStorageService: UserStorageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userId = UserStorageService.getUserId();
    this.getStock(this.userId);
  }

  getStock(userId:any) {
    this.authService.getStock(userId).subscribe((data) => {
      this.stock = data.content;
      console.log(data);
    });
  }

  delete(productId: any) {
    this.authService.deleteProduct(productId).subscribe(() => {
      console.log("Deleted Product Successfully");
      // Remove the deleted product from the 'products' array
      this.stock = this.stock.filter((product: any) => product.id !== productId);
    });
  }

  edit(productId: any){
    this.userStorageService.saveProductId(productId);
    this.router.navigateByUrl("user/edit-product");
  }
}
