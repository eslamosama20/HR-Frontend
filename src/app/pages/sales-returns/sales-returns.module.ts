import { NgModule } from '@angular/core';
import {SalesReturnsRoutingModule} from "./sales-returns-routing.module";



import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    SalesReturnsRoutingModule,
  ]
})
export class SalesReturnsModule { }
