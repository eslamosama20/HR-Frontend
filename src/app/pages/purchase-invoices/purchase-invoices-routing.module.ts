import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseInvoiceFormComponent } from './purchase-invoice-form/purchase-invoice-form.component';
import { PurchaseInvoiceListComponent } from './purchase-invoice-list/purchase-invoice-list.component';
import { PurchaseInvoiceDetailsComponent } from './purchase-invoice-details/purchase-invoice-details.component';
import { PurchaseInvoiceReportComponent } from './purchase-invoice-report/purchase-invoice-report.component';
import { PERMISSIONS } from '../../config/permissions';
import { PermissionGuard } from '../../guards/permission.guard';

const routes: Routes = [
  { path: 'request-quotation', loadChildren: () => import('./request-quotation/request-quotation.module').then(m => m.RequestQuotationModule) },
  {
    path: 'new',
    component: PurchaseInvoiceFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseInvoice.Create] }
  },
  {
    path: 'frontal-new',
    component: PurchaseInvoiceFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseInvoice.Create, PERMISSIONS.FrontalPurchaseInvoice.Read] }
  },
  {
    path: 'list',
    component: PurchaseInvoiceListComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseInvoice.Read] }
  },
  {
    path: 'frontal-list',
    component: PurchaseInvoiceListComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalPurchaseInvoice.Read] }
  },
  {
    path: 'edit/:id',
    component: PurchaseInvoiceFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseInvoice.Update] }
  },
  {
    path: 'frontal-edit/:id',
    component: PurchaseInvoiceFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseInvoice.Update] }
  },
  {
    path: ':id',
    component: PurchaseInvoiceDetailsComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseInvoice.Read, PERMISSIONS.FrontalPurchaseInvoice.Read] }
  },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PurchaseInvoicesRoutingModule {}
