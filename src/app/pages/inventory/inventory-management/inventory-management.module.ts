import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {TabViewModule} from "primeng/tabview";
import {InventoryManagementComponent} from "./inventory-management/inventory-management.component";
import {TranslateModule} from "@ngx-translate/core";
import {TranslationModule} from "../../../modules/i18n";
import {RouterModule} from "@angular/router";
import {BuilderComponent} from "../../builder/builder.component";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {ToastModule} from "primeng/toast";
import {InputTextModule} from "primeng/inputtext";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {TableModule} from "primeng/table";
import { ButtonModule } from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {DropdownModule} from "primeng/dropdown";
import {InputNumberModule} from "primeng/inputnumber";
import {CalendarModule} from "primeng/calendar";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import {HttpClientModule} from "@angular/common/http";
import {TooltipModule} from "primeng/tooltip";


@NgModule({
  declarations: [
    InventoryManagementComponent,
  ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        InputTextModule,
        ConfirmDialogModule,
        ToastModule,
        TableModule,
        DropdownModule,
        InputNumberModule,
        CalendarModule,
        TabViewModule,
        TranslateModule,
        TranslationModule,
        ButtonModule,
        DialogModule,
        HttpClientModule,
        TooltipModule,
        RouterModule.forChild([
            {
                path: '',
                component: InventoryManagementComponent,
            },
        ]),
        ConfirmDialogModule,
        ToastModule,
        InputTextModule,
        OverlayPanelModule,
        TableModule,
        DialogModule,
        ReactiveFormsModule,
        CustomDatePipe,
    ],

})
export class InventoryManagementModule { }
