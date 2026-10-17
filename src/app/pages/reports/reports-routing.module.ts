import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PERMISSIONS } from '../../config/permissions';
import { PermissionGuard } from '../../guards/permission.guard';
import { InventoryReportComponent } from './inventory-report/inventory-report.component';
import { SupplierReportComponent } from './supplier-report/supplier-report.component';
import {PurchasableCardReportComponent} from "./purchasable-card-report/purchasable-card-report.component";
import { PurchaseInvoiceDetailsComponent } from '../purchase-invoices/purchase-invoice-details/purchase-invoice-details.component';
import { PurchaseInvoiceReportComponent } from './purchase-invoice-report/purchase-invoice-report.component';
import { SalesInvoiceReportComponent } from './sales-invoice-report/sales-invoice-report.component';
import { SalesVatTotalReportComponent } from './sales-vat-total-report/sales-vat-total-report.component';
import { SalesVATReportComponent } from './sales-vat-report/sales-vat-report.component';
import { PurchaseVatReportComponent } from './purchase-vat-report/purchase-vat-report.component';
import { PurchaseInvoiceSummaryReportComponent } from './purchase-invoice-summary-report/purchase-invoice-summary-report.component';
import { SalesInvoiceSummaryReportComponent } from './sales-invoice-summary-report/sales-invoice-summary-report.component';
import { SalesVatSummaryReportComponent } from './sales-vat-summary-report/sales-vat-summary-report.component';
import { PurchaseVatTotalReportComponent } from './purchase-vat-total-report/purchase-vat-total-report.component';
import { PurchaseVatSummaryReportComponent } from './purchase-vat-summary-report/purchase-vat-summary-report.component';
import { InventoryReport3Component } from './inventory-report-3/inventory-report-3.component';
import { SupplierReportByReceiptComponent } from './supplier-report-by-receipt/supplier-report-by-receipt.component';
import {SupplierReportByStoreComponent} from "./supplier-report-by-store/supplier-report-by-store.component";
import {
  SupplierReportByMainPurchaseClassComponent
} from "./supplier-report-by-main-purchase-class/supplier-report-by-main-purchase-class.component";
import { PurchaseReturnVatReportComponent } from './purchase-return-vat-report/purchase-return-vat-report.component';
import { SalesCreditNoteVatReportComponent } from './sales-credit-note-vat-report/sales-credit-note-vat-report.component';
import { NetSalesVatReportComponent } from './net-sales-vat-report/net-sales-vat-report.component';
import { NetPurchaseVatReportComponent } from './net-purchase-vat-report/net-purchase-vat-report.component';
import { NetDueVatReportComponent } from './net-due-vat-report/net-due-vat-report.component';
import { TopSellingProductsComponent } from './top-selling-products/top-selling-products.component';
import { TopOrderedProductsComponent } from './top-ordered-products/top-ordered-products.component';

const routes: Routes = [
  {
    path: 'inventory-report-3',
    component: InventoryReport3Component
  },
  {
    path: 'inventory-report/:type',
    component: InventoryReportComponent
  },
  {
    path: 'supplier-report/:id',
    component: SupplierReportComponent
  },
  {
    path: 'supplier-report-by-receipt',
    component: SupplierReportByReceiptComponent
  },
  {
    path: 'supplier-report-by-main-purchase-class',
    component: SupplierReportByMainPurchaseClassComponent
  },
  {
    path: 'supplier-report-by-store',
    component: SupplierReportByStoreComponent
  },
  {
    path: 'purchasable-card-report',
    component: PurchasableCardReportComponent
  },
  {
    path: 'purchasable-invoice-report',
    component: PurchaseInvoiceReportComponent
  },
  {
    path: 'sales-invoice-report',
    component: SalesInvoiceReportComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.SalesInvoiceReport.Read] }
  },
  {
    path: 'sales-vat-total-report',
    component: SalesVatTotalReportComponent
  },
  {
    path: 'sales-vat-report',
    component: SalesVATReportComponent
  },
  {
    path: 'purchase-vat-report',
    component: PurchaseVatReportComponent
  },
  {
    path: 'purchase-invoice-summary-report',
    component: PurchaseInvoiceSummaryReportComponent
  },
  {
    path: 'sales-invoice-summary-report',
    component: SalesInvoiceSummaryReportComponent,
    data: { permissions: [PERMISSIONS.SalesInvoiceReport.Read] }
  },
  {
    path: 'sales-vat-summary-report',
    component: SalesVatSummaryReportComponent
  },
  {
    path: 'purchase-vat-total-report',
    component: PurchaseVatTotalReportComponent
  },
  {
    path: 'purchase-vat-summary-report',
    component: PurchaseVatSummaryReportComponent
  },
  {
    path: 'purchase-return-vat-report',
    component: PurchaseReturnVatReportComponent
  },
  {
    path: 'sales-credit-note-vat-report',
    component: SalesCreditNoteVatReportComponent
  },
  {
    path: 'net-sales-vat-report',
    component: NetSalesVatReportComponent
  },
  {
    path: 'net-purchase-vat-report',
    component: NetPurchaseVatReportComponent
  },
  {
    path: 'net-due-vat-report',
    component: NetDueVatReportComponent
  },
  {
    path: 'top-selling-products',
    component: TopSellingProductsComponent
  },
  {
    path: 'top-ordered-products',
    component: TopOrderedProductsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }
