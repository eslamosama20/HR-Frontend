import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseReturnListComponent } from './purchase-return-list/purchase-return-list.component';
import { PurchaseReturnFormComponent } from './purchase-return-form/purchase-return-form.component';
import { PurchaseReturnDetailsComponent } from './purchase-return-details/purchase-return-details.component';
import { PERMISSIONS } from '../../config/permissions';
import { PermissionGuard } from '../../guards/permission.guard';

const routes: Routes = [
  {
    path: 'new',
    component: PurchaseReturnFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseReturn.Create] }
  },
  {
    path: 'list',
    component: PurchaseReturnListComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseReturn.Read] }
  },
  {
    path: 'edit/:id',
    component: PurchaseReturnFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseReturn.Update] }
  },
  {
    path: ':id',
    component: PurchaseReturnDetailsComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseReturn.Read] }
  },
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PurchaseReturnsRoutingModule {}
