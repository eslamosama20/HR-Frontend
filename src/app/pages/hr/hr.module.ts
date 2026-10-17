import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule} from "@angular/router";
import {HrComponent} from "./hr.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {TranslateModule} from "@ngx-translate/core";
import {DropdownModule} from "primeng/dropdown";
import {ButtonModule} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {ToastModule} from "primeng/toast";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {TableModule} from "primeng/table";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {InputNumberModule} from "primeng/inputnumber";
import {InputTextModule} from "primeng/inputtext";
import {ShiftsComponent} from "./shifts/shifts.component";
import {CalendarModule} from "primeng/calendar";
import {EmploymentTypesComponent} from "./employmentTypes/employmentTypes.component";
import {EmployeesComponent} from "./employees/employees.component";
import {EmployeeComponent} from "./employees/employee/employee.component";
import {CardModule} from "primeng/card";
import {PanelModule} from "primeng/panel";
import { NgApexchartsModule } from 'ng-apexcharts';
import {AttendanceComponent} from "./attendance/attendance.component";
import {CheckInLogComponent} from "./checkInLog/checkInLog.component";
import {MonthlyLoanComponent} from "./monthly-loan/monthly-loan.component";
import {BonusComponent} from "./bonus/bonus.component";
import {PenaltyComponent} from "./penalty/penalty.component";
import {PaymentCalculatorComponent} from "./payment-calculator/payment-calculator.component";
import {OvertimeHoursComponent} from "./overtime-hours/overtime-hours.component";
import {MultiSelectModule} from "primeng/multiselect";
import {TranslateDaysPipe} from "../../pipes/translate-days.pipe";
import {HrAttachmentComponent} from "./hr-attachment/hr-attachment.component";
import {FileUpload, FileUploadModule} from "primeng/fileupload";
import {FingerprintDeviceSettingsComponent} from "./fingerprint-device-settings/fingerprint-device-settings.component";
import {InputSwitchModule} from "primeng/inputswitch";
import {OvertimePaymentCalculatorComponent} from "./overtime-payment-calculator/overtime-payment-calculator.component";


@NgModule({
  declarations: [
    ShiftsComponent,
    HrComponent,
    EmploymentTypesComponent,
    EmployeesComponent,
    EmployeeComponent,
    AttendanceComponent,
    CheckInLogComponent,
    MonthlyLoanComponent,
    BonusComponent,
    PenaltyComponent,
    PaymentCalculatorComponent,
    OvertimeHoursComponent,
    TranslateDaysPipe,
    HrAttachmentComponent,
    FingerprintDeviceSettingsComponent,
    OvertimePaymentCalculatorComponent
  ],
  imports: [
    FileUploadModule,
    MultiSelectModule,
    NgApexchartsModule,
    CalendarModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    DropdownModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TableModule,
    OverlayPanelModule,
    InputNumberModule,
    InputTextModule,
    CardModule,
    PanelModule,
    RouterModule.forChild([
      {
        path: '',
        component: HrComponent,
        children: [
          {
            path: 'shifts',
            component: ShiftsComponent
          },
          {
            path: 'employment-types',
            component: EmploymentTypesComponent
          },
          {
            path: 'employees',
            component: EmployeesComponent
          },
          {
            path: 'employee/:id',
            component: EmployeeComponent
          },
          {
            path: 'employee',
            component: EmployeeComponent
          },
          {
            path: 'attendances',
            component: AttendanceComponent
          },
          {
            path: 'check-in-logs',
            component: CheckInLogComponent
          },
          {
            path: 'monthly-loans',
            component: MonthlyLoanComponent
          },
          {
            path: 'bonuses',
            component: BonusComponent
          },
          {
            path: 'overtime-hours',
            component: OvertimeHoursComponent
          },
          {
            path: 'penalties',
            component: PenaltyComponent
          },
          {
            path: 'payment-calculator',
            component: PaymentCalculatorComponent
          },
          {
            path: 'overtime-payment-calculator',
            component: OvertimePaymentCalculatorComponent
          },
          {
            path: 'attachments',
            component: HrAttachmentComponent
          },
          {
            path: 'fingerprint-device-settings',
            component: FingerprintDeviceSettingsComponent
          }
        ]
      },
      {
        path: '**',
        redirectTo: 'error/404',
      }
    ]),
    InputSwitchModule,
  ]
})
export class HrModule { }
