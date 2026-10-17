import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesInvoiceListComponent } from './sales-invoice-list/sales-invoice-list.component';
import { InvoiceDetailsComponent } from './invoice-details/invoice-details.component';
import { InvoiceReportComponent } from './invoice-report/invoice-report.component';
import {SalesInvoiceFormComponent} from "./sales-invoice-form/sales-invoice-form.component";
import { ReservationInvoicesListComponent } from './reservation-invoices-list/reservation-invoices-list.component';
import { ReservationInvoiceDetailsComponent } from './reservation-invoice-details/reservation-invoice-details.component';

import { PERMISSIONS } from '../../config/permissions';
import { PermissionGuard } from '../../guards/permission.guard';

const routes:Routes = [
  {
    path: 'new',
    component: SalesInvoiceFormComponent,
    data: { permissions: [PERMISSIONS.SalesInvoice.Create] }
  },
  {
    path: 'frontal-new',
    component: SalesInvoiceFormComponent,
    data: { permissions: [PERMISSIONS.SalesInvoice.Create, PERMISSIONS.FrontalSalesInvoice.Read] }
  },
  {
    path: 'list',
    component: SalesInvoiceListComponent,
    data: { permissions: [PERMISSIONS.SalesInvoice.Read] }
  },
  {
    path:'frontal-list',
    component: SalesInvoiceListComponent,
    data: { permissions: [PERMISSIONS.FrontalSalesInvoice.Read] }
  },
  {
    path: 'reservation-list',
    component: ReservationInvoicesListComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationInvoice.Read] }
  },
  {
    path: 'reservation-details/:id',
    component: ReservationInvoiceDetailsComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationInvoice.Read], title: 'INVOICE.RESERVATION_INVOICE_DETAILS', breadcrumb: 'INVOICE.RESERVATION_INVOICE_DETAILS' }
  },
  {
    path: 'edit/:id',
    component: SalesInvoiceFormComponent,
    data: { permissions: [PERMISSIONS.SalesInvoice.Update], title: 'INVOICE.EDIT_SALES_INVOICE', breadcrumb: 'INVOICE.EDIT_SALES_INVOICE' }
  },
  {
    path: ':id',
    component: InvoiceDetailsComponent,
    data: { permissions: [PERMISSIONS.SalesInvoice.Read, PERMISSIONS.FrontalSalesInvoice.Read, PERMISSIONS.Reservation.Read], title: 'INVOICE.SALES_INVOICE_DETAILS', breadcrumb: 'INVOICE.SALES_INVOICE_DETAILS' }
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
export class InvoicesRoutingModule {

 }
