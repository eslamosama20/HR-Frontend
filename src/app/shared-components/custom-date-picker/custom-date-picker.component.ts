import { Component, Input, Output, EventEmitter, forwardRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../modules/i18n';

@Component({
  selector: 'app-custom-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarModule, TranslateModule],
  templateUrl: './custom-date-picker.component.html',
  styleUrls: ['./custom-date-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDatePickerComponent),
      multi: true
    }
  ]
})
export class CustomDatePickerComponent implements OnInit, ControlValueAccessor {
  @Input() placeholder: string = '';
  @Input() dateFormat: string = 'dd/mm/yy';
  @Input() showIcon: boolean = true;
  @Input() appendTo: string = '';
  @Input() styleClass: string = '';
  @Input() inputStyleClass: string = '';
  @Input() disabled: boolean = false;
  @Input() baseZIndex: number = 10000;

  @Output() onSelect = new EventEmitter<any>();
  @Output() onChange = new EventEmitter<any>();

  value: Date | null = null;
  activeLanguage: string = 'ar';

  monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  private onChangeCallback: (_: any) => void = () => {};
  private onTouchedCallback: () => void = () => {};

  constructor(
    private translationService: TranslationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate.onLangChange.subscribe(event => {
      this.activeLanguage = event.lang;
    });
  }

  todayDate: Date = new Date();

  onCalendarShow(cal: any): void {
    const targetDate = this.value ? new Date(this.value) : new Date();
    if (cal) {
      cal.currentMonth = targetDate.getMonth();
      cal.currentYear = targetDate.getFullYear();
      cal.createMonths(cal.currentMonth, cal.currentYear);
    }
  }

  get monthsList(): string[] {
    return this.activeLanguage === 'en' ? this.monthsEn : this.monthsAr;
  }

  onMonthSelect(monthVal: string, cal: any): void {
    const month = parseInt(monthVal, 10);
    cal.currentMonth = month;
    cal.createMonths(cal.currentMonth, cal.currentYear);
  }

  onYearInput(yearVal: string, cal: any): void {
    const year = parseInt(yearVal, 10);
    if (year > 1900 && year < 2100) {
      cal.currentYear = year;
      cal.createMonths(cal.currentMonth, cal.currentYear);
    }
  }

  onDateSelect(val: any): void {
    this.value = val;
    this.onChangeCallback(val);
    this.onTouchedCallback();
    this.onSelect.emit(val);
    this.onChange.emit(val);
  }

  onModelChange(val: any): void {
    this.value = val;
    this.onChangeCallback(val);
    this.onChange.emit(val);
  }

  // ControlValueAccessor Interface Implementation
  writeValue(val: any): void {
    if (val !== undefined) {
      this.value = val ? new Date(val) : null;
      this.cdr.markForCheck();
    }
  }

  registerOnChange(fn: any): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
