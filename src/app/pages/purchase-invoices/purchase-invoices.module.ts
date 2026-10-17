import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseInvoicesRoutingModule } from './purchase-invoices-routing.module';
import { PurchaseInvoiceListComponent } from './purchase-invoice-list/purchase-invoice-list.component';
import { PurchaseInvoiceFormComponent } from './purchase-invoice-form/purchase-invoice-form.component';
import { PurchaseInvoiceDetailsComponent } from './purchase-invoice-details/purchase-invoice-details.component';
import { PurchaseInvoiceReportComponent } from './purchase-invoice-report/purchase-invoice-report.component';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    PurchaseInvoicesRoutingModule,
    PurchaseInvoiceListComponent,
    PurchaseInvoiceFormComponent,
    PurchaseInvoiceDetailsComponent,
    PurchaseInvoiceReportComponent
  ]
})
export class PurchaseInvoicesModule {}
