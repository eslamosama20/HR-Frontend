import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RequestQuotationListComponent } from './request-quotation-list/request-quotation-list.component';
import { RequestQuotationFormComponent } from './request-quotation-form/request-quotation-form.component';

const routes: Routes = [
  { path: '', component: RequestQuotationListComponent },
  { path: 'new', component: RequestQuotationFormComponent },
  { path: 'view/:id', component: RequestQuotationFormComponent },
  { path: 'edit/:id', component: RequestQuotationFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RequestQuotationRoutingModule {}
