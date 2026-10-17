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
import {RecipesComponent} from "./recipes/recipes.component";
import {
  RecipeEntriesEditableTableComponent
} from "./recipes/recipe/recipe-entries-editable-table/recipe-entries-editable-table.component";
import {RecipeComponent} from "./recipes/recipe/recipe.component";
import {InputTextareaModule} from "primeng/inputtextarea";
import {
  ExitRecipeEntriesEditableTableComponent
} from "./recipes/recipe/exit-recipe-entries-editable-table/exit-recipe-entries-editable-table.component";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent } from '../../shared-components/detail-actions-menu/detail-actions-menu.component';

@NgModule({
  declarations: [
    RecipesComponent,
    RecipeEntriesEditableTableComponent,
    RecipeComponent,
    ExitRecipeEntriesEditableTableComponent
  ],
    imports: [
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
                component: RecipesComponent,
            },
            {
                path: 'new',
                component: RecipeComponent,
            },
            {
                path: ':id',
                component: RecipeComponent,
            },
            {
                path: '**',
                redirectTo: 'error/404',
            }
        ]),
        RouterLink,
        NgOptimizedImage,
        InputTextareaModule,
        CustomDatePipe,
        BackButtonComponent,
        DetailActionsMenuComponent,

    ]
})
export class RecipesModule { }
