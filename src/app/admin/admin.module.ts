import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddProductComponent } from './components/add-product/add-product.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { EditProductComponent } from './components/edit-product/edit-product.component';
import { BulkUploadModalComponent } from './components/bulk-upload-modal/bulk-upload-modal.component';



@NgModule({
  declarations: [
    DashboardComponent,
    AddProductComponent,
    EditProductComponent,
    BulkUploadModalComponent,
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    FontAwesomeModule
  ]
})
export class AdminModule { }
