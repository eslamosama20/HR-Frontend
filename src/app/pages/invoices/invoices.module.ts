import { NgModule } from '@angular/core';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';

import { InvoicesRoutingModule } from './invoices-routing.module';
import { InvoiceDetailsComponent } from './invoice-details/invoice-details.component';
import {SalesInvoiceListComponent} from "./sales-invoice-list/sales-invoice-list.component";


@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    InvoicesRoutingModule,
    SalesInvoiceListComponent,
    InvoiceDetailsComponent,
  ]
})
export class InvoicesModule { }
