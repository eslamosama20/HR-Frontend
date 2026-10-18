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
import {AttendanceModel} from "../../../models/hr/attendance.model";
import {AttendanceService} from "../../../services/hr/attendance.service";
import {formatDateOnly, parseDateOnly, unFormatDateOnly} from "../../../utils/formatDateOnly";
import {EmployeeModel} from "../../../models/hr/employee.model";
import {EmployeeService} from "../../../services/hr/employee.service";
import {forkJoin} from "rxjs";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-attendances',
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class AttendanceComponent implements OnInit{

  attendanceFlagOptions = [
    {label: 'حاضر', value: 'Present'},
    {label: 'تأخير بدون إذن', value: 'LateEntry'},
    {label: 'تأخير بإذن', value: 'LateWithPermission'},
    {label: 'خروج مبكر', value: 'EarlyExit'},
    {label: 'غائب', value: 'Absent'},
    {label: 'عطلة', value: 'Holiday'},
    {label: 'اجازة بإذن', value: 'OnLeaveWithPermission'},
    {label: 'اجازة بدون إذن', value: 'OnLeaveWithoutPermission'},
    {label: 'اجازة أسبوعية', value: 'Weekend'},
    {label: 'نصف يوم', value: 'HalfDay'},
  ];
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
  attendanceSignal = signal<any[]>([]);
  get attendances() {
    return this.attendanceSignal();
  }
  set attendances(value) {
    this.attendanceSignal.set(value);
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

  attendanceDialogVisibleSignal = signal(false);
  get attendanceDialogVisible() {
    return this.attendanceDialogVisibleSignal();
  }
  set attendanceDialogVisible(value) {
    this.attendanceDialogVisibleSignal.set(value);
  }
  attendanceFormGroup : FormGroup;
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
    public attendanceService: AttendanceService,
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

    this.attendanceFormGroup = this.fb.group({
      id: [null],
      employeeId: [null, Validators.required],
      attendanceDate: [new Date(), Validators.required],
      attendanceFlag: ['Present', Validators.required],
      reason: [null],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'employeeDeviceId', header: "كود الموظف", filter: true , filterType: 'text'},
      {field: 'employeeName', header:"اسم الموظف", filter: true , filterType: 'text'},
      {field: 'attendanceDate', header: "تاريخ الحضور", filter: true , filterType: 'date'},
      {field: 'attendanceFlagArabic', header: "النوع", filter: true , filterType: 'text'},
      {field: 'reason', header: "السبب / الملاحظات", filter: true , filterType: 'text'},
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
      attendances: this.attendanceService.getAll()
    }).subscribe({
      next: ({  employees , attendances }) => {
        this.employees = employees;
        this.attendances = attendances.map(x => {
          const matchedEmp = (this.employees || []).find(e => e.id === x.employeeId) || x.employee;
          return {
            ...x,
            employeeDeviceId: matchedEmp?.deviceId || x.employee?.deviceId || '',
            attendanceDate: typeof x.attendanceDate === "string" ? new Date(x.attendanceDate) : x.attendanceDate,
            employeeName: matchedEmp?.name || x.employee?.name || (x as any).employeeName,
            createdAt: new Date(x.createdAt),
            attendanceFlagArabic:
              x.attendanceFlag === "Present" ? "حاضر"
                : x.attendanceFlag === "LateEntry" ? "تأخير بدون إذن"
                  : x.attendanceFlag === "LateWithPermission" ? "تأخير بإذن"
                  : x.attendanceFlag === "EarlyExit" ? "خروج مبكر"
                    : x.attendanceFlag === "Absent" ? "غائب"
                      : x.attendanceFlag === "Holiday" ? "عطلة"
                        : x.attendanceFlag === "OnLeaveWithPermission" ? "اجازة بإذن"
                          : x.attendanceFlag === "OnLeaveWithoutPermission" ? "اجازة بدون إذن"
                            : x.attendanceFlag === "Weekend" ? "عطلة"
                              : x.attendanceFlag === "HalfDay" ? "نصف يوم"
                          : "غير محدد",
            reason: x.reason || '-',
          };
        }).sort((a, b) => {
          const tA = a.attendanceDate instanceof Date ? a.attendanceDate.getTime() : new Date(a.attendanceDate).getTime();
          const tB = b.attendanceDate instanceof Date ? b.attendanceDate.getTime() : new Date(b.attendanceDate).getTime();
          return tB - tA;
        });
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Attendances', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.METALS_LOADING_ERROR')
        })
      }
    })
  }

  getFlagClass(flagArabic: string): string {
    switch (flagArabic) {
      case "حاضر":
        return "text-green-700 bg-green-300 rounded px-2 py-1";
      case "دخول متأخر":
      case "تأخير بدون إذن":
        return "text-yellow-700 bg-yellow-300 rounded px-2 py-1";
      case "تأخير بإذن":
        return "text-blue-700 bg-blue-200 rounded px-2 py-1";
      case "خروج مبكر":
      case "خروج متأخر":
        return "text-gray-700 bg-gray-300 rounded px-2 py-1";
      case "غائب":
        return "text-red-700 bg-red-300 rounded px-2 py-1";
      case "عطلة":
      case "اجازة أسبوعية":
      case "عطلة أسبوعية":
        return "text-blue-700 bg-blue-300 rounded px-2 py-1";
      case "اجازة بإذن":
      case "اجازة المنح":
        return "text-purple-700 bg-purple-300 rounded px-2 py-1";
      case "اجازة بدون إذن":
        return "text-orange-700 bg-orange-300 rounded px-2 py-1";
      default:
        return "text-black";
    }
  }

  showAddAttendanceDialog(attendance: AttendanceModel = null) {
    this.attendanceFormGroup.reset();
    if (attendance) {
      this.attendanceFormGroup.controls.id.setValue(attendance.id);
      this.attendanceFormGroup.controls.employeeId.setValue(attendance.employeeId);
      this.attendanceFormGroup.controls.attendanceDate.setValue(attendance.attendanceDate);
      this.attendanceFormGroup.controls.attendanceFlag.setValue(attendance.attendanceFlag);
      this.attendanceFormGroup.controls.reason.setValue(attendance.reason && attendance.reason !== '-' ? attendance.reason : '');
    }
    this.attendanceDialogVisible = true;
  }

  closeAttendanceDialog() {
    this.attendanceDialogVisible = false;
    this.attendanceFormGroup.reset();
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

  saveAttendance() {
    if (this.attendanceFormGroup.invalid) {
      return;
    }
    const attendanceValues = this.attendanceFormGroup.value;
    if (attendanceValues.id) {
      console.log('updating attendance', attendanceValues)
      const attendance = new AttendanceModel();
      attendance.id = attendanceValues.id;
      attendance.employeeId = attendanceValues.employeeId;
      attendance.attendanceDate = formatDateOnly(attendanceValues.attendanceDate);
      attendance.attendanceFlag = attendanceValues.attendanceFlag;
      attendance.reason = attendanceValues.reason;
      this.attendanceService.update(attendance).subscribe({
        next: (res: any) => {
          this.closeAttendanceDialog();
          const detailMsg = res?.message || "تم التعديل بنجاح";
          const isWarn = detailMsg.includes("تنبيه") || detailMsg.includes("نفذ");
          this.messageService.add({
            severity: isWarn ? 'warn' : 'success',
            summary: isWarn ? 'تنبيه رصيد الإجازات' : this.translate.instant('FINANCE.SUCCESS'),
            detail: detailMsg,
            life: isWarn ? 8000 : 4000
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving Attendance', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء التعديل" });
          this.closeAttendanceDialog();
        }
      });
    }else{
      const attendance = new AttendanceModel();
      attendance.employeeId = attendanceValues.employeeId;
      attendance.attendanceDate = formatDateOnly(attendanceValues.attendanceDate);
      attendance.attendanceFlag = attendanceValues.attendanceFlag;
      attendance.reason = attendanceValues.reason;
      this.attendanceService.create(attendance).subscribe({
        next: (res: any) => {
          console.log('Attendance Saved', res);
          this.closeAttendanceDialog();
          const detailMsg = res?.message || "تم الإنشاء بنجاح";
          const isWarn = detailMsg.includes("تنبيه") || detailMsg.includes("نفذ");
          this.messageService.add({
            severity: isWarn ? 'warn' : 'success',
            summary: isWarn ? 'تنبيه رصيد الإجازات' : this.translate.instant('FINANCE.CONFIRMED'),
            detail: detailMsg,
            life: isWarn ? 8000 : 4000
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving Attendance', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الإنشاء" });
          this.closeAttendanceDialog();
        }
      });
    }
  }

  deleteAttendance(attendance: AttendanceModel) {
    this.attendanceService.delete(attendance.id).subscribe({
      next: (res: any) => {
        const detailMsg = res?.message || "تم الحذف بنجاح";
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: detailMsg });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Attendance', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmAttendanceDeletion(event: Event , attendance: any) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف الحضور لموظف "${attendance.employeeName}" بتاريخ "${attendance.attendanceDate}" ؟`,
        header: "حذف الحضور",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteAttendance(attendance);
        },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.attendances.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'Attendances');
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
