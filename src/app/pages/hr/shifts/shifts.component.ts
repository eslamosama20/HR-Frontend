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
import {ShiftModel} from "../../../models/hr/shift.model";
import {ShiftService} from "../../../services/hr/shift.service";
import {getTimeFromDate} from "../../../utils/getTimeFromDate";
import {getDateFromTimeString} from "../../../utils/getDateFromTimeString";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrl: './shifts.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class ShiftsComponent implements OnInit{
  shiftSignal = signal<ShiftModel[]>([]);
  get shifts() {
    return this.shiftSignal();
  }
  set shifts(value) {
    this.shiftSignal.set(value);
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

  shiftDialogVisibleSignal = signal(false);
  get shiftDialogVisible() {
    return this.shiftDialogVisibleSignal();
  }
  set shiftDialogVisible(value) {
    this.shiftDialogVisibleSignal.set(value);
  }
  shiftFormGroup : FormGroup;
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
    public shiftService: ShiftService,
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

    this.shiftFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      name: ['', Validators.required],
      startTime: [null, Validators.required],
      endTime: [null, Validators.required],
      gracePeriodInMinutes: [null],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'referenceNumber', header: "رقم الدوام", filter: true , filterType: 'text'},
      {field: 'name', header: this.translate.instant('FINANCE.NAME'), filter: true , filterType: 'text'},
      {field: 'startTime', header: "وقت البدء", filter: true , filterType: 'date'},
      {field: 'endTime', header: "وقت الانتهاء", filter: true , filterType: 'date'},
      {field: 'gracePeriodInMinutes', header: "فترة السماح", filter: true , filterType: 'number'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'}
    ];
  }

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts() {
    this.loading = true;
    this.shiftService.getAll().subscribe({
      next: shifts => {
        this.shifts = shifts.map(x => {
          x.createdAt = new Date(x.createdAt);
          if (!(x.startTime instanceof Date)) {
            x.startTime = getDateFromTimeString(x.startTime);
          }
          if (!(x.endTime instanceof Date)) {
            x.endTime = getDateFromTimeString(x.endTime);
          }
          return x;
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Shifts', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.METALS_LOADING_ERROR')
        })
      }
    })
  }

  showAddShiftDialog(shift: ShiftModel = null) {
    this.shiftFormGroup.reset();
    if (shift) {
      const startTime = shift.startTime instanceof Date
        ? shift.startTime
        : (shift.startTime ? getDateFromTimeString(String(shift.startTime)) : null);
      const endTime = shift.endTime instanceof Date
        ? shift.endTime
        : (shift.endTime ? getDateFromTimeString(String(shift.endTime)) : null);

      this.shiftFormGroup.controls.id.setValue(shift.id);
      this.shiftFormGroup.controls.name.setValue(shift.name);
      this.shiftFormGroup.controls.startTime.setValue(startTime);
      this.shiftFormGroup.controls.endTime.setValue(endTime);
      this.shiftFormGroup.controls.gracePeriodInMinutes.setValue(shift.gracePeriodInMinutes);
      this.shiftFormGroup.controls.referenceNumber.setValue(shift.referenceNumber);
    }
    this.shiftDialogVisible = true;
  }

  closeShiftDialog() {
    this.shiftDialogVisible = false;
    this.shiftFormGroup.reset();
  }

  public parseTimeString(input: any): Date | null {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

    let str = String(input).trim();
    if (!str) return null;

    // Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard digits
    str = str.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString())
             .replace(/[۰-۹]/g, d => (d.charCodeAt(0) - 1776).toString());

    // Detect AM / PM (Arabic: ص / صباحا, م / مساء or English: am, pm)
    let isPm: boolean | null = null;
    if (/(^|[\s\d])(م|مساء|مساءً|pm|p)($|[\s\d])/i.test(str)) {
      isPm = true;
    } else if (/(^|[\s\d])(ص|صباحا|صباحاً|am|a)($|[\s\d])/i.test(str)) {
      isPm = false;
    }

    // Extract hours and minutes
    const match = str.match(/(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?(?:\s*[:.]\s*(\d{1,2}))?/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    let minutes = match[2] ? parseInt(match[2], 10) : 0;

    if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;

    if (isPm === true) {
      if (hours < 12) hours += 12;
    } else if (isPm === false) {
      if (hours === 12) hours = 0;
    }

    if (hours < 0 || hours > 23) return null;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  onTimeBlur(controlName: 'startTime' | 'endTime', cal?: any, event?: any) {
    const inputEl = cal?.inputfieldViewChild?.nativeElement || event?.target;
    const rawValue = inputEl ? inputEl.value : '';
    if (!rawValue || !rawValue.trim()) {
      return;
    }

    const parsed = this.parseTimeString(rawValue);
    if (parsed) {
      this.shiftFormGroup.get(controlName)?.setValue(parsed);
      this.shiftFormGroup.get(controlName)?.markAsDirty();
      this.shiftFormGroup.get(controlName)?.updateValueAndValidity();
      if (cal) {
        cal.value = parsed;
        if (typeof cal.updateModel === 'function') {
          cal.updateModel(parsed);
        }
        if (typeof cal.updateInputfield === 'function') {
          cal.updateInputfield();
        }
      }
    }
  }

  onTimeEnter(controlName: 'startTime' | 'endTime', cal?: any, event?: any) {
    if (event) {
      event.preventDefault();
    }
    this.onTimeBlur(controlName, cal, event);
  }

  syncControlFromCal(controlName: 'startTime' | 'endTime', cal: any) {
    if (cal && cal.value) {
      this.shiftFormGroup.get(controlName)?.setValue(cal.value);
      this.shiftFormGroup.get(controlName)?.markAsDirty();
      this.shiftFormGroup.get(controlName)?.updateValueAndValidity();
    }
  }

  makeTimePickerEditable(cal: any, controlName: 'startTime' | 'endTime') {
    setTimeout(() => {
      const overlay = cal?.overlayViewChild?.nativeElement || document.querySelector('.shift-timepicker-panel');
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

      // Wrap updateTime on the calendar instance to always sync spans
      if (!cal.__timepickerHooked) {
        cal.__timepickerHooked = true;

        const origUpdateTime = cal.updateTime.bind(cal);
        cal.updateTime = () => {
          origUpdateTime();
          updateSpansFromCal();
          this.syncControlFromCal(controlName, cal);
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

      // Initial sync
      updateSpansFromCal();

      // Listen to click and mouseup on all buttons in the timepicker
      overlay.querySelectorAll('.p-timepicker button').forEach((btn: HTMLElement) => {
        if (!btn.getAttribute('data-sync-listener')) {
          btn.setAttribute('data-sync-listener', 'true');
          btn.addEventListener('click', () => {
            setTimeout(() => {
              updateSpansFromCal();
              this.syncControlFromCal(controlName, cal);
            }, 0);
          });
          btn.addEventListener('mouseup', () => {
            setTimeout(() => {
              updateSpansFromCal();
              this.syncControlFromCal(controlName, cal);
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
            this.syncControlFromCal(controlName, cal);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            cal.decrementHour(e);
            cal.updateTime();
            updateSpansFromCal();
            this.syncControlFromCal(controlName, cal);
          } else if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            if (/[٠-٩]/.test(e.key)) {
              // allow Arabic-Indic digits
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
              this.syncControlFromCal(controlName, cal);
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
          this.syncControlFromCal(controlName, cal);
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
            this.syncControlFromCal(controlName, cal);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            cal.decrementMinute(e);
            cal.updateTime();
            updateSpansFromCal();
            this.syncControlFromCal(controlName, cal);
          } else if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            if (/[٠-٩]/.test(e.key)) {
              // allow Arabic-Indic digits
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
              this.syncControlFromCal(controlName, cal);
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
          this.syncControlFromCal(controlName, cal);
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

  saveShift() {
    // If raw values in controls are strings, parse them
    ['startTime', 'endTime'].forEach((ctrlName: 'startTime' | 'endTime') => {
      const val = this.shiftFormGroup.get(ctrlName)?.value;
      if (val && typeof val === 'string') {
        const parsed = this.parseTimeString(val);
        if (parsed) {
          this.shiftFormGroup.get(ctrlName)?.setValue(parsed);
        }
      }
    });

    if (this.shiftFormGroup.invalid) {
      this.shiftFormGroup.markAllAsTouched();
      return;
    }
    const shiftValues = this.shiftFormGroup.value;
    if (shiftValues.id) {
      console.log('updating shift', shiftValues)
      const shift = new ShiftModel();
      shift.id = shiftValues.id;
      shift.name = shiftValues.name;
      shift.startTime = getTimeFromDate(shiftValues.startTime);
      shift.endTime = getTimeFromDate(shiftValues.endTime);
      shift.gracePeriodInMinutes = shiftValues.gracePeriodInMinutes;
      shift.referenceNumber = shiftValues.referenceNumber;
      this.shiftService.update(shift).subscribe({
        next: res => {
          this.closeShiftDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم التعديل بنجاح" });
          this.loadShifts();
        },
        error: error => {
          console.log('Error Saving Shift', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء التعديل" });
          this.closeShiftDialog();
        }
      });
    }else{
      const shift = new ShiftModel();
      shift.name = shiftValues.name;
      shift.referenceNumber = '';
      shift.startTime = getTimeFromDate(shiftValues.startTime);
      shift.endTime = getTimeFromDate(shiftValues.endTime);
      shift.gracePeriodInMinutes = shiftValues.gracePeriodInMinutes;
      this.shiftService.create(shift).subscribe({
        next: res => {
          console.log('Shift Saved', res);
          this.closeShiftDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الإنشاء بنجاح" });
          this.loadShifts();
        },
        error: error => {
          console.log('Error Saving Shift', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الإنشاء" });
          this.closeShiftDialog();
        }
      });
    }
  }

  deleteShift(shift: ShiftModel) {
    this.shiftService.delete(shift.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الحذف بنجاح" });
        this.loadShifts();
      },
      error: error => {
        console.log('Error Deleting Shift', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmShiftDeletion(event: Event , shift: ShiftModel) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف الدوام "${shift.name}" ؟`,
        header: "حذف الدوام",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteShift(shift);
        },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.shifts.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'Shifts');
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
