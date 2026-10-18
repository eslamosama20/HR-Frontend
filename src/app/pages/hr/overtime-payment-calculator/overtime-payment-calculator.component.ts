import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {PaymentCalculatorService} from "../../../services/hr/payment-calculator.service";
import {MessageService, PrimeNGConfig} from "primeng/api";
import {formatDateOnly} from "../../../utils/formatDateOnly";
import primengArTranslations from "../../../utils/primengArTranslations";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {OvertimePaymentResultModel} from "../../../models/hr/overtime-payment-result.model";
@Component({
  selector: 'app-payment-calculator',
  templateUrl: './overtime-payment-calculator.component.html',
  styleUrl: './overtime-payment-calculator.component.scss',
  providers: [ MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class OvertimePaymentCalculatorComponent implements OnInit {

  constructor(
    private paymentCalculatorService: PaymentCalculatorService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig
  ) {
    this.primengConfig.setTranslation(primengArTranslations);
  }

  maxSelectableDate: Date = new Date();

  ngOnInit(): void {
    this.loadData();
    this.maxSelectableDate.setDate(1);
    this.selectedDate = this.maxSelectableDate;
    this.checkIfMonthFinished()
  }

  overtimePaymentResultsSignal = signal<OvertimePaymentResultModel>(null);

  get overtimePaymentResults() {
    return this.overtimePaymentResultsSignal();
  }

  set overtimePaymentResults(value) {
    this.overtimePaymentResultsSignal.set(value);
  }

  loading: boolean = false;
  searchValueSignal = signal('');

  get searchValue() {
    return this.searchValueSignal();
  }

  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  get filteredFactory1OvertimePayments() {
    if (!this.overtimePaymentResults?.factory1OvertimePayments) return [];
    if (!this.searchValue?.trim()) return this.overtimePaymentResults.factory1OvertimePayments;
    const term = this.searchValue.trim().toLowerCase();
    return this.overtimePaymentResults.factory1OvertimePayments.filter(p =>
      (p.employeeName && p.employeeName.toLowerCase().includes(term)) ||
      (p.deviceId && p.deviceId.toString().toLowerCase().includes(term)) ||
      (p.employeeTypeName && p.employeeTypeName.toLowerCase().includes(term))
    );
  }

  get filteredFactory2OvertimePayments() {
    if (!this.overtimePaymentResults?.factory2OvertimePayments) return [];
    if (!this.searchValue?.trim()) return this.overtimePaymentResults.factory2OvertimePayments;
    const term = this.searchValue.trim().toLowerCase();
    return this.overtimePaymentResults.factory2OvertimePayments.filter(p =>
      (p.employeeName && p.employeeName.toLowerCase().includes(term)) ||
      (p.deviceId && p.deviceId.toString().toLowerCase().includes(term)) ||
      (p.employeeTypeName && p.employeeTypeName.toLowerCase().includes(term))
    );
  }

  get filteredFactory3OvertimePayments() {
    if (!this.overtimePaymentResults?.factory3OvertimePayments) return [];
    if (!this.searchValue?.trim()) return this.overtimePaymentResults.factory3OvertimePayments;
    const term = this.searchValue.trim().toLowerCase();
    return this.overtimePaymentResults.factory3OvertimePayments.filter(p =>
      (p.employeeName && p.employeeName.toLowerCase().includes(term)) ||
      (p.deviceId && p.deviceId.toString().toLowerCase().includes(term)) ||
      (p.employeeTypeName && p.employeeTypeName.toLowerCase().includes(term))
    );
  }

  selectedDateSignal = signal<Date>(new Date());

  get selectedDate() {
    return this.selectedDateSignal();
  }

  set selectedDate(value) {
    this.selectedDateSignal.set(value);
  }

  loadData() {
    this.loading = true;
    this.selectedDate.setDate(1)
    let month = formatDateOnly(this.selectedDate);
    this.paymentCalculatorService.getOvertimePaymentResults(month).subscribe({
      next: data => {
        this.overtimePaymentResults = data;
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'تم حساب الساعات الاضافيه بنجاح'});
      },
      error: error => {
        console.log('Error Loading Payment Results', error)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء حساب الساعات الاضافيه'
        })
      },
      complete: () => {
        this.loading = false
      }
    })
  }

  monthNoteSignal = signal('');

  get monthNote() {
    return this.monthNoteSignal();
  }

  set monthNote(value: string) {
    this.monthNoteSignal.set(value);
  }

  checkIfMonthFinished() {
    if (!this.selectedDate) {
      this.monthNote = '';
      return;
    }

    const now = new Date();
    const selectedYear = this.selectedDate.getFullYear();
    const selectedMonth = this.selectedDate.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // If selected month is the current month
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      this.monthNote = 'تحذير: الشهر المختار لم ينتهي'
    } else {
      this.monthNote = '';
    }
  }

  downloadAsExcel(factory: number): void {
    const headerColumns = [[
      'م', 'كود', 'الاسم', 'الوظيفة', 'المرتب الأساسي', 'سعر الساعة', 'عدد الساعات الإضافية', 'الأجر المستحق'
    ]];

    // Create sheet from header
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(headerColumns);

    // Get the correct factory data
    let data: any[][] = [];

    const records = factory === 1
      ? this.filteredFactory1OvertimePayments
      : factory === 2
      ? this.filteredFactory2OvertimePayments
      : this.filteredFactory3OvertimePayments;

    data = records.map((pr, index) => ([
      index + 1,                // Serial number
      pr.deviceId || '',
      pr.employeeName,
      pr.employeeTypeName,
      pr.monthlyRate,
      pr.hourlyRate,
      pr.overtimeHours,
      pr.overtimePayment
    ]));

    // Append data starting at row 1 (below the header)
    XLSX.utils.sheet_add_aoa(ws, data, {origin: -1});

    // Apply styling (borders + alignment)
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({r: R, c: C});
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = {
          alignment: {horizontal: 'center', vertical: 'center'},
          border: {
            top: {style: 'thin'},
            bottom: {style: 'thin'},
            left: {style: 'thin'},
            right: {style: 'thin'}
          }
        };
      }
    }

    // Build and download the Excel file
    const wb: XLSX.WorkBook = {
      Sheets: {'الساعات_الاضافيه': ws},
      SheetNames: ['الساعات_الاضافيه'],
      Workbook: {Views: [{RTL: true}]}
    };

    XLSX.writeFile(
      wb,
      `الساعات_الاضافيه_الموظفين_لشهر_${this.selectedDate.getFullYear()}_${this.selectedDate.getMonth() + 1}.xlsx`,
      {bookType: 'xlsx', cellStyles: true}
    );
  }
}
