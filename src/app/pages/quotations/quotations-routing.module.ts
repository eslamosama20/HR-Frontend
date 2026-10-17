import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuotationListComponent } from './quotation-list/quotation-list.component';
import { QuotationDetailsComponent } from './quotation-details/quotation-details.component';
import {QuotationFormComponent} from "./quotation-form/quotation-form.component";

import { PERMISSIONS } from '../../config/permissions';

const routes:Routes = [
  {
    path: 'new',
    component: QuotationFormComponent,
    data: { permissions: [PERMISSIONS.SalesQuotation.Create] }
  },
  {
    path: 'list',
    component: QuotationListComponent,
    data: { permissions: [PERMISSIONS.SalesQuotation.Read] }
  },
  {
    path: 'edit/:id',
    component: QuotationFormComponent,
    data: { permissions: [PERMISSIONS.SalesQuotation.Update] }
  },
  {
    path: ':id',
    component: QuotationDetailsComponent,
    data: { permissions: [PERMISSIONS.SalesQuotation.Read] }
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
export class QuotationsRoutingModule {

 }
