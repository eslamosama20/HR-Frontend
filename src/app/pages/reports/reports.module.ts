import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';

import { ReportsRoutingModule } from './reports-routing.module';
import { FormsModule } from '@angular/forms';
import { InventoryReportComponent } from './inventory-report/inventory-report.component';
import { SupplierReportComponent } from './supplier-report/supplier-report.component';
import {PrintDocumentComponent} from "../../shared-components/print-document/print-document.component";
import {PurchasableCardReportComponent} from "./purchasable-card-report/purchasable-card-report.component";
import { InventoryReport3Component } from './inventory-report-3/inventory-report-3.component';
import { SupplierReportByReceiptComponent } from './supplier-report-by-receipt/supplier-report-by-receipt.component';


@NgModule({
  declarations: [
  ],
  imports: [CustomDatePipe, 
    CommonModule,
    ReportsRoutingModule,
    FormsModule,
    InventoryReportComponent,
    InventoryReport3Component,
    SupplierReportByReceiptComponent,
    SupplierReportComponent,
    PurchasableCardReportComponent,
    PrintDocumentComponent,
    NgOptimizedImage,
  ]

})
export class ReportsModule { }
