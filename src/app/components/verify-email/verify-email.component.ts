import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth-service/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  message = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status = 'error';
      this.message = 'Invalid verification link.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.status = 'success';
        this.message = 'Your email has been verified! You can now log in.';
        setTimeout(() => this.router.navigateByUrl('/login'), 3000);
      },
      error: (err) => {
        this.status = 'error';
        this.message = err?.error?.message || 'This verification link is invalid or has expired.';
      }
    });
  }

  goToLogin() {
    this.router.navigateByUrl('/login');
  }
}