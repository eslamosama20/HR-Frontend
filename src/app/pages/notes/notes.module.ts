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
import {RouterModule} from "@angular/router";
import {DebitNoteListComponent} from "./debit-note-list/debit-note-list.component";
import {DebitNoteComponent} from "./debit-note-list/debit-note/debit-note.component";
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import {FileUploadModule} from "primeng/fileupload";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent } from '../../shared-components/detail-actions-menu/detail-actions-menu.component';
import {NgbModalModule} from "@ng-bootstrap/ng-bootstrap";
import { PERMISSIONS } from '../../config/permissions';
import { PermissionGuard } from '../../guards/permission.guard';


@NgModule({
  declarations: [
    DebitNoteListComponent,
    DebitNoteComponent,

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
        path: 'debit-notes',
        component: DebitNoteListComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.DebitNote.Read] },
      },
      {
        path: 'debit-notes/new',
        component: DebitNoteComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.DebitNote.Create] },
      },
      {
        path: 'debit-notes/:id',
        component: DebitNoteComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.DebitNote.Read, PERMISSIONS.DebitNote.Update] },
      },
      {
        path: '**',
        redirectTo: 'error/404',
      }
    ]),
    FileUploadModule,
    CustomDatePipe,
    BackButtonComponent,
    DetailActionsMenuComponent,
    NgbModalModule,

  ]
})
export class NotesModule { }
