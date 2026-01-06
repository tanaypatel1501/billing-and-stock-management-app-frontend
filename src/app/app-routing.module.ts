import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { RegisterComponent } from './components/register/register.component';
import { NoauthGuard } from './guards/noAuth/noauth.guard';
import { AdminGuard } from './guards/admin-guard/admin.guard';
import { UserGuard } from './guards/user-guard/user.guard';
import { ProfileComponent } from './components/profile/profile.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

const routes: Routes = [
  {
    path : "home", component : HomeComponent,canActivate:[NoauthGuard],title: 'GST Medicose'
  },
  {
    path : "login", component : LoginComponent,canActivate:[NoauthGuard], title: 'Login | GST Medicose'
  },
  {
    path : "register", component : RegisterComponent,canActivate:[NoauthGuard], title: 'Register | GST Medicose'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,canActivate:[NoauthGuard],
    title: 'Forgot Password | GST Medicose'
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,canActivate:[NoauthGuard],
    title: 'Reset Password | GST Medicose'
  },
  {
    path : "profile", 
    component : ProfileComponent,
    canActivate:[UserGuard || AdminGuard],
    title: 'Profile | GST Medicose'
  },
  { 
    path: 'admin', 
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule), 
    canActivate: [AdminGuard] 
  },
  { 
    path: 'user', 
    loadChildren: () => import('./user/user.module').then(m => m.UserModule),
    canActivate: [UserGuard] 
  },
  {
    path : '',
    redirectTo : '/home',
    pathMatch : 'full'
  },
  {
    path : "**",
    component : NotFoundComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }