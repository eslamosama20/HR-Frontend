import {NgModule} from '@angular/core';
import {CommonModule, DatePipe} from '@angular/common';
import {SharedModule} from "../../_metronic/shared/shared.module";
import {ModalsModule} from "../../_metronic/partials";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {SafeHtmlPipe} from "./common/safe-html.pipe";
import {TranslateModule} from "@ngx-translate/core";
import {provideNativeDateAdapter} from "@angular/material/core";
import {EntityManagerComponent} from "./entity-manager.component";
import {NgbDropdownConfig, NgbDropdownModule} from "@ng-bootstrap/ng-bootstrap";
import { ButtonModule } from 'primeng/button';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {DialogModule} from "primeng/dialog";
import {DropdownModule} from "primeng/dropdown";
import {InputTextModule} from "primeng/inputtext";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {MultiSelectModule} from 'primeng/multiselect';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";


@NgModule({
  declarations: [
    EntityManagerComponent,
  ],
    imports: [
        SharedModule,
        CommonModule,
        ModalsModule,
        FormsModule,
        ReactiveFormsModule,
        SafeHtmlPipe,
        TranslateModule,
        NgbDropdownModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        DropdownModule,
        InputTextModule,
        OverlayPanelModule,
        TableModule,
        ToastModule,
        MultiSelectModule,
        CustomDatePipe,
    ],
  providers: [provideNativeDateAdapter(), NgbDropdownConfig, DatePipe],
  exports: [
    EntityManagerComponent,
  ],
})
export class EntityManagerModule {
}
