import { NgModule } from '@angular/core';
import {PurchaseReturnsRoutingModule} from "./purchase-returns-routing.module";
import {PrintDocumentComponent} from "../../shared-components/print-document/print-document.component";



import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    PurchaseReturnsRoutingModule,
    PrintDocumentComponent
  ]
})
export class PurchaseReturnsModule { }
