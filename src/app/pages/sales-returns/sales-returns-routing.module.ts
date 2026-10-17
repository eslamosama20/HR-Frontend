import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesReturnListComponent } from './sales-return-list/sales-return-list.component';
import {SalesReturnFormComponent} from "./sales-return-form/sales-return-form.component";
import {SalesReturnDetailsComponent} from "./sales-return-details/sales-return-details.component";

import { PERMISSIONS } from '../../config/permissions';

const routes:Routes = [
  {
    path: 'new',
    component: SalesReturnFormComponent,
    data: { permissions: [PERMISSIONS.SalesReturn.Create, 'SaleReturn.Create'] }
  },
  {
    path: 'list',
    component: SalesReturnListComponent,
    data: { permissions: [PERMISSIONS.SalesReturn.Read, 'SaleReturn.Read'] }
  },
  {
    path: 'edit/:id',
    component: SalesReturnFormComponent,
    data: { permissions: [PERMISSIONS.SalesReturn.Update, 'SaleReturn.Update'] }
  },
  {
    path: ':id',
    component: SalesReturnDetailsComponent,
    data: { permissions: [PERMISSIONS.SalesReturn.Read, 'SaleReturn.Read'] }
  },
  {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full',
  },
];



@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SalesReturnsRoutingModule {

 }
