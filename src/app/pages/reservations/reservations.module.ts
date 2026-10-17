import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, RouterLink } from '@angular/router';
import { PERMISSIONS } from '../../config/permissions';
import { PermissionGuard } from '../../guards/permission.guard';

import { TranslateModule } from '@ngx-translate/core';
import { QRCodeModule } from 'angularx-qrcode';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DataViewModule } from 'primeng/dataview'; // ✅ مهم للكروت
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuModule } from 'primeng/menu';
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ReservationsComponent } from './reservations.component';
import { ReservationComponent } from './reservation/reservation.component';
import { ReservationAdvancedSearchComponent } from './reservation-advanced-search/reservation-advanced-search.component';

import { PrintDocumentComponent } from '../../shared-components/print-document/print-document.component';
import { AbsoluteValuePipe } from '../../pipes/absolute-value.pipe';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';
import { TabViewModule } from 'primeng/tabview';
import { ReservationReportsComponent } from './reservation-reports/reservation-reports.component';
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { ReservationShareModalComponent } from '../../shared-components/reservation-share-modal/reservation-share-modal.component';
import { StickyHorizontalScrollDirective } from '../../shared-components/directives/sticky-horizontal-scroll.directive';

@NgModule({
  declarations: [
    ReservationsComponent,
    ReservationComponent,
    ReservationAdvancedSearchComponent,
    //  ReservationReportsComponent,
  ],
  imports: [
    TabViewModule,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
      ReservationReportsComponent,
      RouterModule.forChild([
      { path: 'reservation-reports', component: ReservationReportsComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.ReservationReports.Read] } },
      { path: '', component: ReservationsComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.Reservation.Read] } },
      { path: 'frontal', component: ReservationsComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.FrontalReservation.Read] } },
      {
        path: 'advanced-search',
        component: ReservationAdvancedSearchComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.ReservationAdvancedSearch.Read] },
      },
      {
        path: 'frontal-advanced-search',
        component: ReservationAdvancedSearchComponent,
        canActivate: [PermissionGuard],
        data: { permissions: [PERMISSIONS.FrontalReservationAdvancedSearch.Read] },
      },
      { path: 'new', component: ReservationComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.Reservation.Create] } },
      { path: ':id', component: ReservationComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.Reservation.Read], title: 'MENU.RESERVATION_DETAILS', breadcrumb: 'MENU.RESERVATION_DETAILS' } },
      { path: 'frontal-new', component: ReservationComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.FrontalReservation.Create] } },
      { path: 'frontal/:id', component: ReservationComponent, canActivate: [PermissionGuard], data: { permissions: [PERMISSIONS.FrontalReservation.Read], title: 'MENU.RESERVATION_DETAILS', breadcrumb: 'MENU.RESERVATION_DETAILS' } },

      { path: '**', redirectTo: 'error/404' },
    ]),
    RouterLink,
    NgOptimizedImage,

    // i18n & util
    TranslateModule,
    QRCodeModule,

    // PrimeNG basics
    ButtonModule,
    SplitButtonModule,
    MenuModule,
    InputTextModule,
    OverlayPanelModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    InputSwitchModule,
    // Data components
    TableModule, // إذا ما زال مستخدم في صفحات أخرى
    DataViewModule, // ✅ لعرض الكروت
    PaginatorModule,
    DropdownModule,
    MultiSelectModule,
    ProgressBarModule,
    InputNumberModule,
    CalendarModule,
    PanelModule,
    DialogModule,
    CardModule,
    DividerModule,
    TagModule,
    FileUploadModule,
    RadioButtonModule,

    // Standalone components/pipes
    PrintDocumentComponent,
    AbsoluteValuePipe,
    CustomDatePipe,
    FontAwesomeModule,
    BackButtonComponent,
    ReservationShareModalComponent,
    StickyHorizontalScrollDirective,
  ],
})
export class ReservationsModule {}
