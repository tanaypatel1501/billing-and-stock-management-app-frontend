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

const routes: Routes = [
  {
    path : "home", component : HomeComponent,canActivate:[NoauthGuard]
  },
  {
    path : "login", component : LoginComponent,canActivate:[NoauthGuard]
  },
  {
    path : "register", component : RegisterComponent,canActivate:[NoauthGuard]
  },
  {
    // FIX: Using UserGuard as the standard authenticated access point.
    // Ensure this guard allows both USER and ADMIN roles.
    path : "profile", 
    component : ProfileComponent,
    canActivate:[UserGuard || AdminGuard]
  },
  // FIX: Corrected lazy loading syntax for modules (critical for Angular apps)
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