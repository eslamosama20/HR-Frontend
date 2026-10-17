import { NgModule } from '@angular/core';

import { QuotationListComponent } from './quotation-list-2/quotation-list.component';
import { QuotationDetailsComponent } from './quotation-details/quotation-details.component';
import {QuotationsRoutingModule} from "./quotations-routing.module";


@NgModule({
  declarations: [],
  imports: [
    QuotationsRoutingModule,
  ]
})
export class QuotationsModule { }
