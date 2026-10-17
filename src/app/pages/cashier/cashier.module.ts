import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashierRoutingModule } from './cashier-routing.module';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    CommonModule,
    CashierRoutingModule
  ]
})
export class CashierModule { }
