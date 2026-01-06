import { APP_INITIALIZER,NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { LoadingComponent } from './loading/loading.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from './services/auth-service/auth.service';
import { initializeApp } from './app-init';
import { ProfileComponent } from './components/profile/profile.component';
import { SearchBarComponent } from './shared/search-bar/search-bar.component';
import { DashboardComponent } from './user/components/dashboard/dashboard.component';
import { FilterButtonComponent } from './shared/filter-button/filter-button.component';
import { AlertComponent } from './shared/alert/alert.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ConfirmDeleteModalComponent } from './shared/confirm-delete-modal/confirm-delete-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    LoadingComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    NavbarComponent,
    NotFoundComponent,
    ProfileComponent,
    AlertComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
  ],
  imports: [
    BrowserModule,
    SearchBarComponent,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    FontAwesomeModule,
    DashboardComponent,
    FilterButtonComponent,
    ConfirmDeleteModalComponent,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true, 
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp, // The factory function to call
      deps: [AuthService], // List of dependencies (AuthService)
      multi: true, // Required for APP_INITIALIZER
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
