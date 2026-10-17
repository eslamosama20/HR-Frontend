import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { DividerModule } from "primeng/divider";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { TreeModule } from "primeng/tree";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { TableModule } from "primeng/table";
import { DropdownModule } from "primeng/dropdown";
import { MultiSelectModule } from "primeng/multiselect";
import { ProgressBarModule } from "primeng/progressbar";
import { InputNumberModule } from "primeng/inputnumber";
import { TranslateModule } from "@ngx-translate/core";
import { PaginatorModule } from "primeng/paginator";
import { OverlayPanelModule } from "primeng/overlaypanel";
import { CalendarModule } from "primeng/calendar";
import { PanelModule } from "primeng/panel";
import { InputSwitchModule } from "primeng/inputswitch";
import { CheckboxModule } from "primeng/checkbox";
import { TooltipModule } from "primeng/tooltip";
import { InputTextareaModule } from "primeng/inputtextarea";
import { AbsoluteValuePipe } from "../../pipes/absolute-value.pipe";
import { RouterModule } from "@angular/router";
import { PaycheckReceiptListComponent } from "./paycheck-receipt-list/paycheck-receipt-list.component";
import { PaymentReceiptListComponent } from "./payment-receipt-list/payment-receipt-list.component";
import { PaycheckReceiptComponent } from "./paycheck-receipt-list/paycheck-receipt/paycheck-receipt.component";
import { PaymentReceiptComponent } from "./payment-receipt-list/payment-receipt/payment-receipt.component";
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { FileUploadModule } from "primeng/fileupload";
import { CustomDatePipe } from "../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { NgbModalModule } from "@ng-bootstrap/ng-bootstrap";
import { PermissionGuard } from '../../guards/permission.guard';
import { PERMISSIONS } from '../../config/permissions';

@NgModule({
  declarations: [
    PaycheckReceiptListComponent,
    PaymentReceiptListComponent,
    PaycheckReceiptComponent,
  ],
  imports: [
    PaymentReceiptComponent,
    PrintDocumentComponent,
    CommonModule,
    FontAwesomeModule,
    DividerModule,
    FormsModule,
    TreeModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ConfirmDialogModule,
    TagModule,
    ToastModule,
    TableModule,
    DropdownModule,
    MultiSelectModule,
    ProgressBarModule,
    InputNumberModule,
    TranslateModule,
    ReactiveFormsModule,
    PaginatorModule,
    OverlayPanelModule,
    CalendarModule,
    PanelModule,
    InputSwitchModule,
    CheckboxModule,
    TooltipModule,
    InputTextareaModule,
    AbsoluteValuePipe,
    NgOptimizedImage,
    FileUploadModule,
    BackButtonComponent,
    NgbModalModule,
    RouterModule.forChild([
      {
        path: 'paycheck-receipts',
        component: PaycheckReceiptListComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.PaycheckReceipt.Read] },
      },
      {
        path: 'paycheck-receipts/new',
        component: PaycheckReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.PaycheckReceipt.Create] },
      },
      {
        path: 'paycheck-receipts/:id',
        component: PaycheckReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.PaycheckReceipt.Read] },
      },
      {
        path: 'frontal-paycheck-receipts',
        component: PaycheckReceiptListComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalPaycheckReceipt.Read] },
      },
      {
        path: 'frontal-paycheck-receipts/new',
        component: PaycheckReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalPaycheckReceipt.Create] },
      },
      {
        path: 'frontal-paycheck-receipts/:id',
        component: PaycheckReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalPaycheckReceipt.Read] },
      },
      {
        path: 'payment-receipts',
        component: PaymentReceiptListComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.PaymentReceipt.Read] },
      },
      {
        path: 'payment-receipts/new',
        component: PaymentReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.PaymentReceipt.Create] },
      },
      {
        path: 'payment-receipts/:id',
        component: PaymentReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.PaymentReceipt.Read] },
      },
      {
        path: 'frontal-payment-receipts',
        component: PaymentReceiptListComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalPaymentReceipt.Read] },
      },
      {
        path: 'frontal-payment-receipts/new',
        component: PaymentReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalPaymentReceipt.Create] },
      },
      {
        path: 'frontal-payment-receipts/:id',
        component: PaymentReceiptComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalPaymentReceipt.Read] },
      },
      {
        path: '**',
        redirectTo: 'error/404',
      }
    ]),
    CustomDatePipe,
  ]
})
export class ReceiptsModule { }
