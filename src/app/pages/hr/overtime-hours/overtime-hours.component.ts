import {Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {PermissionModel} from "../../../models/auth/permission.model";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {AuthService} from "../../../modules/auth";
import {TranslationService} from "../../../modules/i18n";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import primengArTranslations from "../../../utils/primengArTranslations";
import {Table, TableModule} from "primeng/table";
import * as FileSaver from 'file-saver';
import { formatDateOnly} from "../../../utils/formatDateOnly";
import {EmployeeModel} from "../../../models/hr/employee.model";
import {EmployeeService} from "../../../services/hr/employee.service";
import {forkJoin} from "rxjs";
import {OvertimeHoursService} from "../../../services/hr/overtime-hours.service";
import {OvertimeHoursModel} from "../../../models/hr/overtime-hours.model";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-overtime-hours',
  templateUrl: './overtime-hours.component.html',
  styleUrl: './overtime-hours.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class OvertimeHoursComponent implements OnInit{

  employeesSignal = signal<EmployeeModel[]>([]);
  get employees() {
    return this.employeesSignal();
  }
  set employees(value) {
    this.employeesSignal.set(value);
  }
  get employeeOptions(){
    return this.employees.map((ma) => {
      const code = ma.deviceId || ma.referenceNumber || '';
      const displayLabel = code ? `${code} - ${ma.name}` : ma.name;
      return {
        value: ma.id,
        label: displayLabel,
        name: ma.name,
        code: code,
        deviceId: ma.deviceId || '',
        referenceNumber: ma.referenceNumber || ''
      };
    });
  }
  overtimeHoursSignal = signal<any[]>([]);
  get overtimeHours() {
    return this.overtimeHoursSignal();
  }
  set overtimeHours(value) {
    this.overtimeHoursSignal.set(value);
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  overtimeHoursDialogVisibleSignal = signal(false);
  get overtimeHoursDialogVisible() {
    return this.overtimeHoursDialogVisibleSignal();
  }
  set overtimeHoursDialogVisible(value) {
    this.overtimeHoursDialogVisibleSignal.set(value);
  }
  overtimeHoursFormGroup : FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public overtimeHoursService: OvertimeHoursService,
    public employeeService: EmployeeService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.overtimeHoursFormGroup = this.fb.group({
      id: [null],
      employeeId: [null, Validators.required],
      date: [new Date(), Validators.required],
      hoursCount: [0, Validators.required],
      reason: [null],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'employeeDeviceId', header: "كود الموظف", filter: true , filterType: 'text'},
      {field: 'employeeName', header:"اسم الموظف", filter: true , filterType: 'text'},
      {field: 'date', header: "اليوم", filter: true , filterType: 'date'},
      {field: 'hoursCount', header: "عدد الساعات", filter: true , filterType: 'numeric'},
      {field: 'reason', header: "سبب الإضافي", filter: true , filterType: 'text'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'}
    ];
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    forkJoin({
      employees: this.employeeService.getAll(),
      overtimeHours: this.overtimeHoursService.getAll()
    }).subscribe({
      next: ({  employees , overtimeHours }) => {
        this.employees = employees;
        this.overtimeHours = overtimeHours.map(x => {
          const matchedEmp = (employees || []).find(e => e.id === x.employeeId) || x.employee;
          return {
            ...x,
            employeeDeviceId: matchedEmp?.deviceId || x.employee?.deviceId || '',
            date: typeof x.date === "string" ? new Date(x.date) : x.date,
            employeeName: matchedEmp?.name || x.employee?.name || (x as any).employeeName,
            reason: x.reason || '-',
            createdAt: new Date(x.createdAt),
          };
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading OvertimeHours', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.METALS_LOADING_ERROR')
        })
      }
    })
  }


  showAddOvertimeHoursDialog(overtimeHours: OvertimeHoursModel = null) {
    this.overtimeHoursFormGroup.reset();
    if (overtimeHours) {
      this.overtimeHoursFormGroup.controls.id.setValue(overtimeHours.id);
      this.overtimeHoursFormGroup.controls.employeeId.setValue(overtimeHours.employeeId);
      this.overtimeHoursFormGroup.controls.date.setValue(overtimeHours.date);
      this.overtimeHoursFormGroup.controls.hoursCount.setValue(overtimeHours.hoursCount);
      this.overtimeHoursFormGroup.controls.reason.setValue(overtimeHours.reason && overtimeHours.reason !== '-' ? overtimeHours.reason : '');
    }
    this.overtimeHoursDialogVisible = true;
  }

  closeOvertimeHoursDialog() {
    this.overtimeHoursDialogVisible = false;
    this.overtimeHoursFormGroup.reset();
  }

  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains')
  }

  saveOvertimeHours() {
    if (this.overtimeHoursFormGroup.invalid) {
      return;
    }
    const overtimeHoursValues = this.overtimeHoursFormGroup.value;
    if (overtimeHoursValues.id) {
      console.log('updating overtimeHours', overtimeHoursValues)
      const overtimeHours = new OvertimeHoursModel();
      overtimeHours.id = overtimeHoursValues.id;
      overtimeHours.employeeId = overtimeHoursValues.employeeId;
      overtimeHours.date = formatDateOnly(overtimeHoursValues.date);
      overtimeHours.hoursCount = overtimeHoursValues.hoursCount;
      overtimeHours.reason = overtimeHoursValues.reason;
      this.overtimeHoursService.update(overtimeHours).subscribe({
        next: res => {
          this.closeOvertimeHoursDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم التعديل بنجاح" });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving OvertimeHours', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء التعديل" });
          this.closeOvertimeHoursDialog();
        }
      });
    }else{
      const overtimeHours = new OvertimeHoursModel();
      overtimeHours.employeeId = overtimeHoursValues.employeeId;
      overtimeHours.date = formatDateOnly(overtimeHoursValues.date);
      overtimeHours.hoursCount = overtimeHoursValues.hoursCount;
      overtimeHours.reason = overtimeHoursValues.reason;
      this.overtimeHoursService.create(overtimeHours).subscribe({
        next: res => {
          console.log('OvertimeHours Saved', res);
          this.closeOvertimeHoursDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الإنشاء بنجاح" });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving OvertimeHours', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الإنشاء" });
          this.closeOvertimeHoursDialog();
        }
      });
    }
  }

  deleteOvertimeHours(overtimeHours: OvertimeHoursModel) {
    this.overtimeHoursService.delete(overtimeHours.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الحذف بنجاح" });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting OvertimeHours', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmOvertimeHoursDeletion(event: Event , overtimeHours: any) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف المكافأة لموظف "${overtimeHours.employeeName}" بتاريخ "${overtimeHours.date}" ؟`,
        header: "حذف المكافأة",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteOvertimeHours(overtimeHours);
        },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.overtimeHours.map(y => {
        const row = {};
        this.columns.forEach(x => {
          if (x.filterType === 'date') {
            // @ts-ignore
            row[x.detail] = new Date(y[x.field]).toLocaleString(
              'ar-EG-u-ca-gregory',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
          } else {
            // @ts-ignore
            row[x.detail] = y[x.field];
          }
        });
        return row;
      });
      console.log(data);
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'OvertimeHours');
    });
  }
  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION);
  }


}
