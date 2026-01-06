import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserGuard } from '../guards/user-guard/user.guard';
import { AddStockComponent } from './components/stock/add-stock/add-stock.component';
import { EditStockComponent } from './components/stock/edit-stock/edit-stock.component';
import { CreateBillComponent } from './components/create-bill/create-bill.component';
import { DetailsComponent } from './components/details/details.component';
import { BillPreviewComponent } from './components/bill-preview/bill-preview.component';
import { BillsComponent } from './components/bills/bills.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent ,canActivate:[UserGuard]},
  { path: 'stock/add', component: AddStockComponent ,canActivate:[UserGuard]},
  { path: 'stock/edit/:stockId', component: EditStockComponent ,canActivate:[UserGuard]},
  { path: 'create-bill', component: CreateBillComponent ,canActivate:[UserGuard]},
  { path: 'details', component: DetailsComponent ,canActivate:[UserGuard]},
  { path: 'bill-preview', component: BillPreviewComponent ,canActivate:[UserGuard]},
  { path: 'bills', component: BillsComponent ,canActivate:[UserGuard]},
];

@NgModule({
  imports: [RouterModule.forChild(routes)], 
  exports: [RouterModule]
})
export class UserRoutingModule { }
