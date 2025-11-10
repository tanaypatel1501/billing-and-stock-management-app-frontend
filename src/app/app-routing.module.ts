import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { RegisterComponent } from './components/register/register.component';
import { UserModule } from './user/user.module';
import { NoauthGuard } from './guards/noAuth/noauth.guard';
import { AdminModule } from './admin/admin.module';

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
  { path: 'admin', loadChildren: () => AdminModule },
  { path: 'user',loadChildren: () => UserModule },
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
