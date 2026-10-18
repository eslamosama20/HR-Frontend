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
import {DetailAccountService} from "../../../services/accounting/detail-account.service";
import {EmployeeModel} from "../../../models/hr/employee.model";
import {EmployeeService} from "../../../services/hr/employee.service";
import {getTimeFromDate} from "../../../utils/getTimeFromDate";
import {getDateFromTimeString} from "../../../utils/getDateFromTimeString";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class EmployeesComponent implements OnInit{
  employeeSignal = signal<any[]>([]);
  get employees() {
    return this.employeeSignal();
  }
  set employees(value) {
    this.employeeSignal.set(value);
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

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  constructor(
    private primengConfig: PrimeNGConfig,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
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


    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'deviceId', header: "كود الموظف", filter: true , filterType: 'text'},
      {field: 'name', header: this.translate.instant('FINANCE.NAME'), filter: true , filterType: 'text'},
      {field: 'workshop', header: "الصالة", filter: true , filterType: 'text'},
      {field: 'department', header: "القسم", filter: true , filterType: 'text'},
      {field: 'jobTitle', header: "طبيعة العمل", filter: true , filterType: 'text'},
      {field: 'phone', header: "رقم الهاتف", filter: true , filterType: 'text'},
      {field: 'monthlyRate', header: "الأساسي", filter: true , filterType: 'numeric'},
      {field: 'regularityBonus', header: "حافز انتظام", filter: true , filterType: 'numeric'},
      {field: 'totalGrossSalary', header: "إجمالي الراتب", filter: true , filterType: 'numeric'},
      {field: 'monthlyInsurance', header: "التأمينات", filter: true , filterType: 'numeric'},
      {field: 'factoryType', header: "المصنع", filter: true , filterType: 'text'},
    ];
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getAll().subscribe({
      next: employees => {
        this.employees = employees.map(x => (
          {
            ...x,
            createdAt: x.createdAt ? new Date(x.createdAt) : null,
            employmentTypeName: x.employmentType?.code || x.jobTitle || '-',
            shiftName: x.shift?.name || '-',
            totalGrossSalary: (Number(x.monthlyRate) || 0) +
                              (Number(x.livingAllowance) || 0) +
                              (Number(x.mealAllowance) || 0) +
                              (Number(x.transportAllowance) || 0) +
                              (Number(x.housingAllowance) || 0) +
                              (Number(x.extraIncrease) || 0) +
                              (Number(x.supervisionBonus) || 0) +
                              (Number(x.masteryBonus) || 0) +
                              (Number(x.regularityBonus) || 0)
          }
        ))
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Employees', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail:"حدث خطأ أثناء التحميل"
        })
      }
    })
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


  deleteEmployee(employee: EmployeeModel) {
    this.employeeService.delete(employee.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الحذف بنجاح" });
        this.loadEmployees();
      },
      error: error => {
        console.log('Error Deleting Employee', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmEmployeeDeletion(event: Event , employee: EmployeeModel) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف الدوام "${employee.name}" ؟`,
        header: "حذف الدوام",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteEmployee(employee);
        },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.employees.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'Employees');
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
