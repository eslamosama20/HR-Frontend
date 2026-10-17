import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesCreditNoteListComponent } from './sales-credit-note-list/sales-credit-note-list.component';
import { SalesCreditNoteDetailsComponent } from './sales-credit-note-details/sales-credit-note-details.component';
import {SalesCreditNoteFormComponent} from "./sales-credit-note-form/sales-credit-note-form.component";

import { PERMISSIONS } from '../../../config/permissions';

const routes:Routes = [
  {
    path: 'new',
    component: SalesCreditNoteFormComponent,
    data: { permissions: [PERMISSIONS.SalesCreditNote.Create] }
  },
  {
    path: 'list',
    component: SalesCreditNoteListComponent,
    data: { permissions: [PERMISSIONS.SalesCreditNote.Read] }
  },
  {
    path: 'edit/:id',
    component: SalesCreditNoteFormComponent,
    data: { permissions: [PERMISSIONS.SalesCreditNote.Update] }
  },
  {
    path: ':id',
    component: SalesCreditNoteDetailsComponent,
    data: { permissions: [PERMISSIONS.SalesCreditNote.Read] }
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
export class SalesCreditNotesRoutingModule {

 }
