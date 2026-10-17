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
import {CheckInLogModel} from "../../../models/hr/check-in-log.model";
import {CheckInLogService} from "../../../services/hr/check-in-log.service";
import {formatDateAndTime, formatDateOnly, parseDateOnly, unFormatDateOnly} from "../../../utils/formatDateOnly";
import {EmployeeModel} from "../../../models/hr/employee.model";
import {EmployeeService} from "../../../services/hr/employee.service";
import {forkJoin} from "rxjs";
import {formatDate} from "../../../utils/formatDate";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-check-in-log',
  templateUrl: './checkInLog.component.html',
  styleUrl: './checkInLog.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class CheckInLogComponent implements OnInit{

  logTypeOptions = [
    {label: 'دخول', value: 'IN'},
    {label: 'خروج', value: 'OUT'},
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
  checkInLogSignal = signal<any[]>([]);
  get checkInLogs() {
    return this.checkInLogSignal();
  }
  set checkInLogs(value) {
    this.checkInLogSignal.set(value);
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

  checkInLogDialogVisibleSignal = signal(false);
  get checkInLogDialogVisible() {
    return this.checkInLogDialogVisibleSignal();
  }
  set checkInLogDialogVisible(value) {
    this.checkInLogDialogVisibleSignal.set(value);
  }
  checkInLogFormGroup : FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  excelDialogVisible = false;
  excelUploadErrorsSignal = signal<string[]>([]);
  get excelUploadErrors() {
    return this.excelUploadErrorsSignal();
  }
  set excelUploadErrors(val: string[]) {
    this.excelUploadErrorsSignal.set(val);
  }

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public checkInLogService: CheckInLogService,
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

    this.checkInLogFormGroup = this.fb.group({
      id: [null],
      employeeId: [null, Validators.required],
      time: [new Date(), Validators.required],
      logType: ['IN', Validators.required],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'employeeDeviceId', header: "كود الموظف", filter: true , filterType: 'text'},
      {field: 'employeeName', header:"اسم الموظف", filter: true , filterType: 'text'},
      {field: 'time', header: "الوقت", filter: true , filterType: 'date'},
      {field: 'logTypeArabic', header: "النوع", filter: true , filterType: 'text'},
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
      checkInLogs: this.checkInLogService.getAll()
    }).subscribe({
      next: ({  employees , checkInLogs }) => {
        this.employees = employees;
        this.checkInLogs = checkInLogs.map(x => {
          let timeVal = x.time;
          if (typeof timeVal === 'string') {
            const cleanIso = timeVal.replace(/Z$/i, '').replace(/([+-]\d{2}:\d{2})$/, '');
            timeVal = new Date(cleanIso);
          }
          const matchedEmp = (this.employees || []).find(e => e.id === x.employeeId) || x.employee;
          return {
            ...x,
            time: timeVal,
            employeeDeviceId: matchedEmp?.deviceId || x.employee?.deviceId || '',
            employeeName: matchedEmp?.name || x.employee?.name || (x as any).employeeName,
            createdAt: new Date(x.createdAt),
            logTypeArabic:
              x.logType === "IN" ? "دخول"
                : x.logType === "OUT" ? "خروج"
                  : "غير محدد",
          };
        }).sort((a: any, b: any) => {
          const tA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime();
          const tB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime();
          return tB - tA;
        });
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading CheckInLogs', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.METALS_LOADING_ERROR')
        })
      }
    })
  }

  getTypeClass(flagArabic: string): string {
    switch (flagArabic) {
      case "دخول":
        return "text-green-700 bg-green-300 rounded px-2 py-1";
      case "خروج":
        return "text-gray-700 bg-gray-300 rounded px-2 py-1";
        case "غير محدد":
          return "text-black";
          default:
            return "";
    }
  }

  showAddCheckInLogDialog(checkInLog: CheckInLogModel = null) {
    this.checkInLogFormGroup.reset();
    if (checkInLog) {
      this.checkInLogFormGroup.controls.id.setValue(checkInLog.id);
      this.checkInLogFormGroup.controls.employeeId.setValue(checkInLog.employeeId);
      this.checkInLogFormGroup.controls.time.setValue(checkInLog.time);
      this.checkInLogFormGroup.controls.logType.setValue(checkInLog.logType);
    } else {
      this.checkInLogFormGroup.controls.time.setValue(new Date());
      this.checkInLogFormGroup.controls.logType.setValue('IN');
    }
    this.checkInLogDialogVisible = true;
  }

  closeCheckInLogDialog() {
    this.checkInLogDialogVisible = false;
    this.checkInLogFormGroup.reset();
  }

  public parseDateTimeString(input: any, currentDate?: Date): Date | null {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

    let str = String(input).trim();
    if (!str) return null;

    // Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard digits
    str = str.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString())
             .replace(/[۰-۹]/g, d => (d.charCodeAt(0) - 1776).toString());

    let isPm: boolean | null = null;
    if (/(^|[\s\d])(م|مساء|مساءً|pm|p)($|[\s\d])/i.test(str)) {
      isPm = true;
    } else if (/(^|[\s\d])(ص|صباحا|صباحاً|am|a)($|[\s\d])/i.test(str)) {
      isPm = false;
    }

    let dateObj = currentDate ? new Date(currentDate.getTime()) : new Date();

    const dateMatch = str.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
    if (dateMatch) {
      let p1 = parseInt(dateMatch[1], 10);
      let p2 = parseInt(dateMatch[2], 10);
      let p3 = parseInt(dateMatch[3], 10);

      let year = p3;
      let month = p2 - 1;
      let day = p1;

      if (p1 > 1000) {
        year = p1;
        month = p2 - 1;
        day = p3;
      } else if (p3 < 100) {
        year = 2000 + p3;
      }

      dateObj = new Date(year, month, day);
      str = str.replace(dateMatch[0], '').trim();
    }

    const timeMatch = str.match(/(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?(?:\s*[:.]\s*(\d{1,2}))?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      let minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

      if (!isNaN(hours) && !isNaN(minutes) && minutes >= 0 && minutes <= 59) {
        if (isPm === true) {
          if (hours < 12) hours += 12;
        } else if (isPm === false) {
          if (hours === 12) hours = 0;
        }
        if (hours >= 0 && hours <= 23) {
          dateObj.setHours(hours, minutes, 0, 0);
        }
      }
    }

    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  onTimeBlur(cal?: any, event?: any) {
    const inputEl = cal?.inputfieldViewChild?.nativeElement || event?.target;
    const rawValue = inputEl ? inputEl.value : '';
    if (!rawValue || !rawValue.trim()) return;

    const currentVal = this.checkInLogFormGroup.get('time')?.value;
    const parsed = this.parseDateTimeString(rawValue, currentVal instanceof Date ? currentVal : new Date());
    if (parsed) {
      this.checkInLogFormGroup.get('time')?.setValue(parsed);
      this.checkInLogFormGroup.get('time')?.markAsDirty();
      this.checkInLogFormGroup.get('time')?.updateValueAndValidity();
      if (cal) {
        cal.value = parsed;
        if (typeof cal.updateModel === 'function') cal.updateModel(parsed);
        if (typeof cal.updateInputfield === 'function') cal.updateInputfield();
      }
    }
  }

  onTimeEnter(cal?: any, event?: any) {
    if (event) event.preventDefault();
    this.onTimeBlur(cal, event);
  }

  syncControlFromCal(cal: any) {
    if (cal && cal.value) {
      this.checkInLogFormGroup.get('time')?.setValue(cal.value);
      this.checkInLogFormGroup.get('time')?.markAsDirty();
      this.checkInLogFormGroup.get('time')?.updateValueAndValidity();
    }
  }

  makeTimePickerEditable(cal: any) {
    setTimeout(() => {
      const overlay = cal?.overlayViewChild?.nativeElement || document.querySelector('.shift-timepicker-panel') || document.querySelector('.p-datepicker');
      if (!overlay) return;

      const hourPicker = overlay.querySelector('.p-hour-picker');
      const minutePicker = overlay.querySelector('.p-minute-picker');
      const hourSpan = hourPicker?.querySelector('span') as HTMLElement;
      const minuteSpan = minutePicker?.querySelector('span') as HTMLElement;

      if (!hourSpan || !minuteSpan) return;

      const updateSpansFromCal = () => {
        const curHourSpan = overlay.querySelector('.p-hour-picker span') as HTMLElement || hourSpan;
        const curMinuteSpan = overlay.querySelector('.p-minute-picker span') as HTMLElement || minuteSpan;
        if (curHourSpan && document.activeElement !== curHourSpan) {
          const h = cal.currentHour ?? 0;
          curHourSpan.innerText = h < 10 ? `0${h}` : `${h}`;
        }
        if (curMinuteSpan && document.activeElement !== curMinuteSpan) {
          const m = cal.currentMinute ?? 0;
          curMinuteSpan.innerText = m < 10 ? `0${m}` : `${m}`;
        }
      };

      if (!cal.__timepickerHooked) {
        cal.__timepickerHooked = true;

        const origUpdateTime = cal.updateTime.bind(cal);
        cal.updateTime = () => {
          origUpdateTime();
          updateSpansFromCal();
          this.syncControlFromCal(cal);
        };

        let _hour = cal.currentHour;
        Object.defineProperty(cal, 'currentHour', {
          get() { return _hour; },
          set(v) {
            _hour = v;
            updateSpansFromCal();
          },
          configurable: true
        });

        let _minute = cal.currentMinute;
        Object.defineProperty(cal, 'currentMinute', {
          get() { return _minute; },
          set(v) {
            _minute = v;
            updateSpansFromCal();
          },
          configurable: true
        });
      }

      updateSpansFromCal();

      overlay.querySelectorAll('.p-timepicker button').forEach((btn: HTMLElement) => {
        if (!btn.getAttribute('data-sync-listener')) {
          btn.setAttribute('data-sync-listener', 'true');
          btn.addEventListener('click', () => {
            setTimeout(() => {
              updateSpansFromCal();
              this.syncControlFromCal(cal);
            }, 0);
          });
          btn.addEventListener('mouseup', () => {
            setTimeout(() => {
              updateSpansFromCal();
              this.syncControlFromCal(cal);
            }, 0);
          });
        }
      });

      if (!hourSpan.getAttribute('data-editable')) {
        hourSpan.setAttribute('data-editable', 'true');
        hourSpan.setAttribute('contenteditable', 'true');
        hourSpan.setAttribute('inputmode', 'numeric');
        hourSpan.setAttribute('title', 'انقر للكتابة مباشرة');
        hourSpan.classList.add('editable-time-span');

        hourSpan.addEventListener('focus', () => {
          setTimeout(() => {
            const range = document.createRange();
            range.selectNodeContents(hourSpan);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }, 10);
        });

        hourSpan.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            hourSpan.blur();
          } else if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            minuteSpan?.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            cal.incrementHour(e);
            cal.updateTime();
            updateSpansFromCal();
            this.syncControlFromCal(cal);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            cal.decrementHour(e);
            cal.updateTime();
            updateSpansFromCal();
            this.syncControlFromCal(cal);
          } else if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            if (/[٠-٩]/.test(e.key)) {
              // allow
            } else {
              e.preventDefault();
            }
          }
        });

        hourSpan.addEventListener('input', () => {
          let text = hourSpan.innerText.trim();
          text = text.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString());
          if (text.length >= 2) {
            let num = parseInt(text, 10);
            if (!isNaN(num)) {
              if (num < 1) num = 1;
              if (num > 12) num = 12;
              cal.currentHour = num;
              cal.updateTime();
              this.syncControlFromCal(cal);
              minuteSpan?.focus();
            }
          }
        });

        hourSpan.addEventListener('blur', () => {
          let text = hourSpan.innerText.trim();
          text = text.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString());
          let num = parseInt(text, 10);
          if (isNaN(num) || num < 1) num = cal.currentHour || 12;
          if (num > 12) num = 12;

          cal.currentHour = num;
          hourSpan.innerText = num < 10 ? `0${num}` : `${num}`;
          cal.updateTime();
          this.syncControlFromCal(cal);
        });
      }

      if (!minuteSpan.getAttribute('data-editable')) {
        minuteSpan.setAttribute('data-editable', 'true');
        minuteSpan.setAttribute('contenteditable', 'true');
        minuteSpan.setAttribute('inputmode', 'numeric');
        minuteSpan.setAttribute('title', 'انقر للكتابة مباشرة');
        minuteSpan.classList.add('editable-time-span');

        minuteSpan.addEventListener('focus', () => {
          setTimeout(() => {
            const range = document.createRange();
            range.selectNodeContents(minuteSpan);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }, 10);
        });

        minuteSpan.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            minuteSpan.blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            cal.incrementMinute(e);
            cal.updateTime();
            updateSpansFromCal();
            this.syncControlFromCal(cal);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            cal.decrementMinute(e);
            cal.updateTime();
            updateSpansFromCal();
            this.syncControlFromCal(cal);
          } else if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            if (/[٠-٩]/.test(e.key)) {
              // allow
            } else {
              e.preventDefault();
            }
          }
        });

        minuteSpan.addEventListener('input', () => {
          let text = minuteSpan.innerText.trim();
          text = text.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString());
          if (text.length >= 2) {
            let num = parseInt(text, 10);
            if (!isNaN(num)) {
              if (num < 0) num = 0;
              if (num > 59) num = 59;
              cal.currentMinute = num;
              cal.updateTime();
              this.syncControlFromCal(cal);
            }
          }
        });

        minuteSpan.addEventListener('blur', () => {
          let text = minuteSpan.innerText.trim();
          text = text.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString());
          let num = parseInt(text, 10);
          if (isNaN(num) || num < 0) num = cal.currentMinute || 0;
          if (num > 59) num = 59;

          cal.currentMinute = num;
          minuteSpan.innerText = num < 10 ? `0${num}` : `${num}`;
          cal.updateTime();
          this.syncControlFromCal(cal);
        });
      }
    }, 40);
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

  saveCheckInLog() {
    const rawTime = this.checkInLogFormGroup.get('time')?.value;
    if (rawTime && typeof rawTime === 'string') {
      const parsed = this.parseDateTimeString(rawTime);
      if (parsed) {
        this.checkInLogFormGroup.get('time')?.setValue(parsed);
      }
    }

    if (this.checkInLogFormGroup.invalid) {
      this.checkInLogFormGroup.markAllAsTouched();
      return;
    }
    const checkInLogValues = this.checkInLogFormGroup.value;
    // Duplicate validation: same employee, same day, same type
    const logDay = (typeof checkInLogValues.time === 'string' ? new Date(checkInLogValues.time) : checkInLogValues.time);
    const dayStr = logDay instanceof Date
      ? `${logDay.getFullYear()}-${String(logDay.getMonth() + 1).padStart(2, '0')}-${String(logDay.getDate()).padStart(2, '0')}`
      : '';
    const duplicate = this.checkInLogs.some(existing => {
      if (existing.employeeId !== checkInLogValues.employeeId || existing.logType !== checkInLogValues.logType || !existing.time) {
        return false;
      }
      const existingDate = existing.time instanceof Date ? existing.time : new Date(existing.time);
      const existingDayStr = `${existingDate.getFullYear()}-${String(existingDate.getMonth() + 1).padStart(2, '0')}-${String(existingDate.getDate()).padStart(2, '0')}`;
      return existingDayStr === dayStr;
    });
    if (!checkInLogValues.id && duplicate) {
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'لا يمكن إضافة سجل بنفس اليوم والنوع لهذا الموظف.' });
      return;
    }
    const formattedTime = formatDate(checkInLogValues.time);
    if (checkInLogValues.id) {
      console.log('updating checkInLog', checkInLogValues)
      const checkInLog = new CheckInLogModel();
      checkInLog.id = checkInLogValues.id;
      checkInLog.employeeId = checkInLogValues.employeeId;
      checkInLog.time = formattedTime;
      checkInLog.logType = checkInLogValues.logType;
      this.checkInLogService.update(checkInLog).subscribe({
        next: res => {
          this.closeCheckInLogDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم التعديل بنجاح" });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving CheckInLog', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء التعديل" });
          this.closeCheckInLogDialog();
        }
      });
    }else{
      const checkInLog = new CheckInLogModel();
      checkInLog.employeeId = checkInLogValues.employeeId;
      checkInLog.time = formattedTime;
      checkInLog.logType = checkInLogValues.logType;
      this.checkInLogService.create(checkInLog).subscribe({
        next: res => {
          console.log('CheckInLog Saved', res);
          this.closeCheckInLogDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الإنشاء بنجاح" });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving CheckInLog', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الإنشاء" });
          this.closeCheckInLogDialog();
        }
      });
    }
  }

  deleteCheckInLog(checkInLog: CheckInLogModel) {
    this.checkInLogService.delete(checkInLog.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الحذف بنجاح" });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting CheckInLog', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmCheckInLogDeletion(event: Event , checkInLog: any) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف البند من سجل الدحول/الخروج لموظف "${checkInLog.employeeName}" بتاريخ "${checkInLog.time}" ؟`,
        header: "حذف البند من سجل الدحول/الخروج",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteCheckInLog(checkInLog);
        },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.checkInLogs.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'CheckInLogs');
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

  downloadTemplate() {
    import('xlsx').then(xlsx => {
      const ws = xlsx.utils.aoa_to_sheet([
        ['رقم الموظف', 'النوع', 'الوقت'],
        ['123', 'دخول', '2025-06-29 08:00 AM'],
        ['124', 'خروج', '2025-06-29 05:00 PM']
      ]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Template');
      const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(buffer, 'CheckInLog_Template');
    });
  }

  onExcelUpload(event: any, fileInput?: HTMLInputElement) {
    this.excelUploadErrors = [];
    const file = event.target.files[0];
    if (!file) {
      if (fileInput) fileInput.value = '';
      return;
    }
    import('xlsx').then(xlsx => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        const [header, ...body] = rows;
        const requiredHeaders = ['رقم الموظف', 'النوع', 'الوقت'];
        if (!header || requiredHeaders.some((h, i) => header[i] !== h)) {
          this.excelUploadErrors = ['صيغة الملف غير صحيحة. تأكد من أن الأعمدة: رقم الموظف، النوع، الوقت'];
          return;
        }
        // Build a map of deviceId to employeeId for fast lookup
        const deviceIdToEmployeeId = new Map<string, string>();
        this.employees.forEach(emp => {
          if (emp.deviceId) deviceIdToEmployeeId.set(emp.deviceId, emp.id);
        });
        let errors: string[] = [];
        const logs = body.map((row, idx) => {
          const rowNum = idx + 2; // +2 for header and 1-based index
          if (!row || row.length < 3) return null;
          const deviceId = row[0]?.toString().trim();
          const logTypeStr = row[1]?.toString().trim();
          const timeStr = row[2]?.toString().trim();
          let rowErrors: string[] = [];
          // Validate deviceId
          const employeeId = deviceIdToEmployeeId.get(deviceId);
          if (!employeeId) {
            rowErrors.push(`السطر ${rowNum}: رقم الموظف '${deviceId}' غير موجود في النظام.`);
          }
          // Validate logType
          let logType: "IN" | "OUT" | null = null;
          if (logTypeStr === 'دخول') logType = 'IN';
          else if (logTypeStr === 'خروج') logType = 'OUT';
          else {
            rowErrors.push(`السطر ${rowNum}: النوع '${logTypeStr}' غير صحيح. يجب أن يكون 'دخول' أو 'خروج'.`);
          }
          // Handle Excel date/time cell or string
          let formattedTime = '';
          if (typeof row[2] === 'number') {
            // Excel date serial number
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const ms = row[2] * 24 * 60 * 60 * 1000;
            const dateObj = new Date(excelEpoch.getTime() + ms);
            // Format as yyyy-MM-dd hh:mm AM/PM
            const yyyy = dateObj.getFullYear();
            const MM = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const dd = dateObj.getDate().toString().padStart(2, '0');
            let hours = dateObj.getHours();
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
            const hh = hours.toString().padStart(2, '0');
            formattedTime = `${yyyy}-${MM}-${dd} ${hh}:${minutes} ${ampm}`;
          } else {
            formattedTime = timeStr;
          }
          // Validate time format (yyyy-MM-dd hh:mm AM/PM) only if not Excel date
          const timeRegex = /^\d{4}-\d{2}-\d{2} (0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
          if (!timeRegex.test(formattedTime)) {
            rowErrors.push(`السطر ${rowNum}: الوقت '${timeStr}' غير صحيح. الصيغة المتوقعة: yyyy-MM-dd hh:mm AM/PM`);
          }
          // Check for duplicate in current logs (same employee, same day, same type)
          if (employeeId && logType) {
            const logDay = formattedTime.substring(0, 10); // yyyy-MM-dd
            const exists = this.checkInLogs.some(existing =>
              existing.employeeId === employeeId &&
              existing.logType === logType &&
              existing.time &&
              (typeof existing.time === 'string' ? existing.time.substring(0, 10) : new Date(existing.time).toISOString().substring(0, 10)) === logDay
            );
            if (exists) {
              rowErrors.push(`السطر ${rowNum}: لا يمكن إضافة سجل بنفس اليوم والنوع لهذا الموظف.`);
            }
          }
          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
            return null;
          }
          // Convert formattedTime to ISO string for backend
          let isoTime = '';
          if (typeof row[2] === 'number') {
            // Already parsed as dateObj above
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const ms = row[2] * 24 * 60 * 60 * 1000;
            const dateObj = new Date(excelEpoch.getTime() + ms);
            isoTime = formatDate(dateObj);
          } else {
            // Parse from formattedTime string
            // formattedTime: yyyy-MM-dd hh:mm AM/PM
            const match = formattedTime.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) (AM|PM)$/);
            if (match) {
              let [_, year, month, day, hour, minute, ampm] = match;
              let h = parseInt(hour, 10);
              if (ampm === 'PM' && h < 12) h += 12;
              if (ampm === 'AM' && h === 12) h = 0;
              const dateObj = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
                h,
                Number(minute),
                0
              );
              isoTime = formatDate(dateObj);
            }
          }
          const log = new CheckInLogModel();
          log.employeeId = employeeId;
          log.logType = logType;
          log.time = isoTime;
          return log;
        }).filter(x => !!x);
        if (errors.length > 0) {
          this.excelUploadErrors = errors;
          if (fileInput) fileInput.value = '';
          return;
        }
        if (logs.length === 0) {
          this.excelUploadErrors = ['لم يتم العثور على بيانات صالحة في الملف.'];
          if (fileInput) fileInput.value = '';
          return;
        }
        // All valid, send in batch
        this.checkInLogService.createRange(logs).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'تم', detail: `تم رفع ${logs.length} من السجلات بنجاح.` });
            this.loadData();
            this.excelDialogVisible = false;
            if (fileInput) fileInput.value = '';
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'خطأ في الحفظ', detail: 'حدث خطأ أثناء رفع السجلات. حاول مرة أخرى.' });
            if (fileInput) fileInput.value = '';
          }
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

}
