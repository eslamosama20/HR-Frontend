import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestQuotationRoutingModule } from './request-quotation-routing.module';
import { RequestQuotationListComponent } from './request-quotation-list/request-quotation-list.component';
import { RequestQuotationFormComponent } from './request-quotation-form/request-quotation-form.component';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    CommonModule,
    RequestQuotationRoutingModule,
    RequestQuotationListComponent,
    RequestQuotationFormComponent
  ]
})
export class RequestQuotationModule {}
