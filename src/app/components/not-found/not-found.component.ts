import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { UserStorageService } from 'src/app/services/storage/user-storage.service';
import { 
  faHome, 
  faArrowLeft, 
  faMapMarkedAlt, 
  faSignInAlt, 
  faUserPlus, 
  faChartLine, 
  faFileInvoice,
  faBoxOpen
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements OnInit {
  isAuthenticated = false;
  isAdmin = false;
  // FontAwesome Icons
  faHome = faHome;
  faArrowLeft = faArrowLeft;
  faMapMarkedAlt = faMapMarkedAlt;
  faSignInAlt = faSignInAlt;
  faUserPlus = faUserPlus;
  faChartLine = faChartLine;
  faFileInvoice = faFileInvoice;
  faBoxOpen = faBoxOpen;

  constructor(
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    this.isAuthenticated = UserStorageService.isUserLoggedIn() || UserStorageService.isAdminLoggedIn();
    this.isAdmin = UserStorageService.isAdminLoggedIn();
  }

  goHome(): void {
    if (this.isAuthenticated) {
      const isAdmin = UserStorageService.isAdminLoggedIn();
      this.router.navigate([isAdmin ? '/admin/dashboard' : '/user/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }

  goBack(): void {
    this.location.back();
  }
}