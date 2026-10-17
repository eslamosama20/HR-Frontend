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
import {PanelModule} from "primeng/panel";
import {InputSwitchModule} from "primeng/inputswitch";
import {AbsoluteValuePipe} from "../../pipes/absolute-value.pipe";
import {RouterLink, RouterModule} from "@angular/router";
import {PrintDocumentComponent} from "../../shared-components/print-document/print-document.component";
import {RadioButtonModule} from "primeng/radiobutton";
import {InventoryStocktakingListComponent} from "./inventory-stocktaking-list.component";
import { InventoryStocktakingComponent } from './inventory-stocktaking/inventory-stocktaking.component';
import {FileUploadModule} from "primeng/fileupload";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { TooltipModule } from 'primeng/tooltip';
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent } from '../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { PermissionGuard } from '../../guards/permission.guard';
import { PERMISSIONS } from '../../config/permissions';

@NgModule({
  declarations: [
    InventoryStocktakingListComponent,
    InventoryStocktakingComponent,
  ],
    imports: [
        TooltipModule,
        FileUploadModule,
        RadioButtonModule,
        PrintDocumentComponent,
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
        PanelModule,
        InputSwitchModule,
        AbsoluteValuePipe,
        NgOptimizedImage,
        RouterModule.forChild([

            {
                path: '',
                component: InventoryStocktakingListComponent,
                canActivate: [PermissionGuard],
                data: { permissions: [PERMISSIONS.InventoryStocktaking.Read] }
            },
            {
                path: 'new',
                component: InventoryStocktakingComponent,
                canActivate: [PermissionGuard],
                data: { permissions: [PERMISSIONS.InventoryStocktaking.Create] }
            },
            {
                path: ':id',
                component: InventoryStocktakingComponent,
                canActivate: [PermissionGuard],
                data: { permissions: [PERMISSIONS.InventoryStocktaking.Read, PERMISSIONS.InventoryStocktaking.Update] }
            },
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

    ]
})
export class StocktakingModule { }
