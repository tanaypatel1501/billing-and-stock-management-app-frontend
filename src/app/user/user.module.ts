import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AddStockComponent } from './components/add-stock/add-stock.component';
import { CreateBillComponent } from './components/create-bill/create-bill.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DetailsComponent } from './components/details/details.component';
import { BillPreviewComponent } from './components/bill-preview/bill-preview.component';
import { BillsComponent } from './components/bills/bills.component';


@NgModule({
  declarations: [
    DashboardComponent,
    AddStockComponent,
    CreateBillComponent,
    DetailsComponent,
    BillPreviewComponent,
    BillsComponent
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    
  ]
})
export class UserModule { }
