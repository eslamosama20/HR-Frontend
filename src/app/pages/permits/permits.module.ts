import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {DividerModule} from "primeng/divider";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {TreeModule} from "primeng/tree";
import {ButtonModule} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";
import {CardModule} from "primeng/card";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {TagModule} from "primeng/tag";
import {ToastModule} from "primeng/toast";
import {TableModule} from "primeng/table";
import {DropdownModule} from "primeng/dropdown";
import {MultiSelectModule} from "primeng/multiselect";
import {ProgressBarModule} from "primeng/progressbar";
import {InputNumberModule} from "primeng/inputnumber";
import {TranslateModule} from "@ngx-translate/core";
import {PaginatorModule} from "primeng/paginator";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {CalendarModule} from "primeng/calendar";
import {TooltipModule} from "primeng/tooltip";
import {PanelModule} from "primeng/panel";
import {InputSwitchModule} from "primeng/inputswitch";
import {AbsoluteValuePipe} from "../../pipes/absolute-value.pipe";
import {RouterLink, RouterModule} from "@angular/router";
import {InventoryPermitsComponent} from "./inventory-permits/inventory-permits.component";
import {InventoryPermitComponent} from "./inventory-permits/inventory-permit/inventory-permit.component";
import {
  InventoryPermitEntriesEditableTableComponent
} from "./inventory-permits/inventory-permit/inventory-permit-entries-editable-table/inventory-permit-entries-editable-table.component";
import {PrintDocumentComponent} from "../../shared-components/print-document/print-document.component";
import {RadioButtonModule} from "primeng/radiobutton";
import {FileUploadModule} from "primeng/fileupload";
import {CheckboxModule} from "primeng/checkbox";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { PermissionGuard } from '../../guards/permission.guard';
import { PERMISSIONS } from '../../config/permissions';
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent } from '../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { SharedModule } from '../../_metronic/shared/shared.module';

@NgModule({
  declarations: [
    InventoryPermitsComponent,
    InventoryPermitComponent,
    InventoryPermitEntriesEditableTableComponent
  ],
    imports: [
        RadioButtonModule,
        PrintDocumentComponent,
        CheckboxModule,
        FontAwesomeModule,
        DividerModule,
        CommonModule,
        ReactiveFormsModule,
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
        FormsModule,
        PaginatorModule,
        OverlayPanelModule,
        CalendarModule,
        TooltipModule,
        PanelModule,
        InputSwitchModule,
        AbsoluteValuePipe,
        NgOptimizedImage,
        FileUploadModule,
        RouterModule.forChild([

            {
                path: 'inventory-permits',
                component: InventoryPermitsComponent,
                canActivate: [PermissionGuard],
                data: { permissions: [PERMISSIONS.InventoryPermit.Read] }
            },
            {
                path: 'inventory-permits/new/:type',
                component: InventoryPermitComponent,
                canActivate: [PermissionGuard],
                data: { permissions: [PERMISSIONS.InventoryPermit.Create] }
            },
            {
                path: 'inventory-permits/:id',
                component: InventoryPermitComponent,
                canActivate: [PermissionGuard],
                data: { permissions: [PERMISSIONS.InventoryPermit.Read, PERMISSIONS.InventoryPermit.Update] }
            },
            /*{
              path:'paycheck-receipts/new',
              component:PaycheckReceiptComponent
            },
            {
              path:'paycheck-receipts/:id',
              component:PaycheckReceiptComponent
            },*/
            {
                path: '**',
                redirectTo: 'error/404',
            }
        ]),
        RouterLink,
        NgOptimizedImage,
        CustomDatePipe,
        BackButtonComponent,
        DetailActionsMenuComponent,
        SharedModule,

    ]
})
export class PermitsModule { }
