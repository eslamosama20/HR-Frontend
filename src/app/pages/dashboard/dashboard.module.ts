import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ModalsModule, WidgetsModule } from '../../_metronic/partials';
import {CardModule} from "primeng/card";
import {TranslateModule} from "@ngx-translate/core";
import { NgApexchartsModule } from 'ng-apexcharts';
import { Router } from '@angular/router';


import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@NgModule({
  declarations: [DashboardComponent],
  imports: [CustomDatePipe, 
    
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: DashboardComponent,
      },
    ]),
    CardModule,
    TranslateModule,
    NgApexchartsModule,
    

  ],
})
export class DashboardModule {}
