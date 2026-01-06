import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminGuard } from '../guards/admin-guard/admin.guard';
import { AddProductComponent } from './components/add-product/add-product.component';
import { EditProductComponent } from './components/edit-product/edit-product.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate:[AdminGuard], title: 'Dashboard | GST Medicose' },
  { path: 'add-product', component: AddProductComponent, canActivate:[AdminGuard], title: 'Add Product | GST Medicose' },
  { path: 'edit-product', component: EditProductComponent, canActivate:[AdminGuard], title: 'Edit Product | GST Medicose' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
