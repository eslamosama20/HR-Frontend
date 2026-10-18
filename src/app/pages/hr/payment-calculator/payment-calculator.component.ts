import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {PaymentCalculatorService} from "../../../services/hr/payment-calculator.service";
import {MessageService, PrimeNGConfig} from "primeng/api";
import {PaymentResultModel} from "../../../models/hr/payment-result.model";
import {formatDateOnly} from "../../../utils/formatDateOnly";
import primengArTranslations from "../../../utils/primengArTranslations";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
@Component({
  selector: 'app-payment-calculator',
  templateUrl: './payment-calculator.component.html',
  styleUrl: './payment-calculator.component.scss',
  providers: [ MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class PaymentCalculatorComponent implements OnInit {

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

  paymentResultsSignal = signal<PaymentResultModel>(null);
  get paymentResults() {
    return this.paymentResultsSignal();
  }
  set paymentResults(value) {
    this.paymentResultsSignal.set(value);
  }
  loading: boolean = false;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  get filteredFactory1Payments() {
    if (!this.paymentResults?.factory1Payments) return [];
    if (!this.searchValue?.trim()) return this.paymentResults.factory1Payments;
    const term = this.searchValue.trim().toLowerCase();
    return this.paymentResults.factory1Payments.filter(p =>
      (p.employeeName && p.employeeName.toLowerCase().includes(term)) ||
      (p.deviceId && p.deviceId.toString().toLowerCase().includes(term)) ||
      (p.workshop && p.workshop.toLowerCase().includes(term)) ||
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.jobTitle && p.jobTitle.toLowerCase().includes(term))
    );
  }

  get filteredFactory2Payments() {
    if (!this.paymentResults?.factory2Payments) return [];
    if (!this.searchValue?.trim()) return this.paymentResults.factory2Payments;
    const term = this.searchValue.trim().toLowerCase();
    return this.paymentResults.factory2Payments.filter(p =>
      (p.employeeName && p.employeeName.toLowerCase().includes(term)) ||
      (p.deviceId && p.deviceId.toString().toLowerCase().includes(term)) ||
      (p.workshop && p.workshop.toLowerCase().includes(term)) ||
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.jobTitle && p.jobTitle.toLowerCase().includes(term))
    );
  }

  get filteredFactory3Payments() {
    if (!this.paymentResults?.factory3Payments) return [];
    if (!this.searchValue?.trim()) return this.paymentResults.factory3Payments;
    const term = this.searchValue.trim().toLowerCase();
    return this.paymentResults.factory3Payments.filter(p =>
      (p.employeeName && p.employeeName.toLowerCase().includes(term)) ||
      (p.deviceId && p.deviceId.toString().toLowerCase().includes(term)) ||
      (p.workshop && p.workshop.toLowerCase().includes(term)) ||
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.jobTitle && p.jobTitle.toLowerCase().includes(term))
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
    this.paymentCalculatorService.getPaymentResults(month).subscribe({
      next: data => {
        this.paymentResults = data;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'تم حساب المرتبات بنجاح' });
      },
      error: error => {
        console.log('Error Loading Payment Results', error)
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء حساب المرتبات'
        })
      },
      complete:()=>{
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
    // 1) Build header rows
    const headerRows = [
      [
        'م', 'كود', 'الاسم', 'الصالة', 'القسم', 'الوظيفة',
        'تفاصيل الاستحقاقات (الأجر الشامل)', '', '', '', '', '', '', '', '', '', '',
        'تفاصيل المستقطع', '', '', '', '', '', '', '',
        'اجمالي المستقطع', 'صافي المرتب'
      ],
      [
        '', '', '', '', '', '',
        'الأساسي', 'غلاء معيشة', 'بدل وجبة', 'بدل انتقال', 'بدل سكن', 'حافز إجادة', 'حافز انتظام', 'حافز إشراف', 'زيادة إضافية', 'مكافآت', 'إجمالي الأجر',
        'غياب', '', '',
        'خصم انتظام', 'تأخيرات', 'السُلف', 'التأمينات', 'الجزاءات',
        '', ''
      ],
      [
        '', '', '', '', '', '',
        '', '', '', '', '', '', '', '', '', '', '',
        'عدد الأيام', 'أجر اليوم', 'الإجمالي',
        '', '', '', '', '',
        '', ''
      ]
    ];

    // 2) Create sheet from headerRows
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(headerRows);

    // 3) Apply merges
    ws['!merges'] = [
      // Info columns: r:0..2
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 2, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 2, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 2, c: 5 } },
      // Estihqaqat header: col 6..16
      { s: { r: 0, c: 6 }, e: { r: 0, c: 16 } },
      { s: { r: 1, c: 6 }, e: { r: 2, c: 6 } },
      { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } },
      { s: { r: 1, c: 8 }, e: { r: 2, c: 8 } },
      { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },
      { s: { r: 1, c: 10 }, e: { r: 2, c: 10 } },
      { s: { r: 1, c: 11 }, e: { r: 2, c: 11 } },
      { s: { r: 1, c: 12 }, e: { r: 2, c: 12 } },
      { s: { r: 1, c: 13 }, e: { r: 2, c: 13 } },
      { s: { r: 1, c: 14 }, e: { r: 2, c: 14 } },
      { s: { r: 1, c: 15 }, e: { r: 2, c: 15 } },
      { s: { r: 1, c: 16 }, e: { r: 2, c: 16 } },
      // Mostaqta'at header: col 17..24
      { s: { r: 0, c: 17 }, e: { r: 0, c: 24 } },
      // Absence: col 17..19
      { s: { r: 1, c: 17 }, e: { r: 1, c: 19 } },
      // Deductions: col 20..24
      { s: { r: 1, c: 20 }, e: { r: 2, c: 20 } },
      { s: { r: 1, c: 21 }, e: { r: 2, c: 21 } },
      { s: { r: 1, c: 22 }, e: { r: 2, c: 22 } },
      { s: { r: 1, c: 23 }, e: { r: 2, c: 23 } },
      { s: { r: 1, c: 24 }, e: { r: 2, c: 24 } },
      // Totals: col 25, 26
      { s: { r: 0, c: 25 }, e: { r: 2, c: 25 } },
      { s: { r: 0, c: 26 }, e: { r: 2, c: 26 } },
    ];

    // 4) Append data rows under the header (row index 3)
    const mapRow = (pr: any, index: number) => [
      index + 1,
      pr.deviceId || '',
      pr.employeeName,
      pr.workshop || '',
      pr.department || '',
      pr.jobTitle || pr.employeeTypeName || '',
      pr.monthlyRate || 0,
      pr.livingAllowance || 0,
      pr.mealAllowance || 0,
      pr.transportAllowance || 0,
      pr.housingAllowance || 0,
      pr.masteryBonus || 0,
      pr.regularityBonus || 0,
      pr.supervisionBonus || 0,
      pr.extraIncrease || 0,
      pr.totalBonuses || 0,
      pr.totalSalary || 0,
      pr.absentDaysCount || 0,
      pr.dailyRate || 0,
      pr.totalAbsentPenalty || 0,
      pr.regularityDeduction || 0,
      pr.totalLateEntryPenalty || 0,
      pr.totalLoans || 0,
      pr.insurance || 0,
      pr.totalPenalties || 0,
      pr.totalSubtractedAmount || 0,
      pr.netPay || 0
    ];

    let data: any[] = [];
    if (factory === 1) {
      data = this.filteredFactory1Payments.map(mapRow);
    } else if (factory === 2) {
      data = this.filteredFactory2Payments.map(mapRow);
    } else {
      data = this.filteredFactory3Payments.map(mapRow);
    }
    XLSX.utils.sheet_add_aoa(ws, data, { origin: 3 });

    // 5) Auto-calc the full range so we know where to style:
    const range = XLSX.utils.decode_range(ws['!ref']);

    // 6) Loop over every cell in the sheet and add centering + thin border
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = {
          // center text both ways
          alignment: { horizontal: 'center', vertical: 'center' },
          // thin border on all sides
          border: {
            top:    { style: 'thin' },
            bottom: { style: 'thin' },
            left:   { style: 'thin' },
            right:  { style: 'thin' },
          }
        };
      }
    }

    // 7) Build workbook, enable RTL, and download
    const wb: XLSX.WorkBook = {
      Sheets: { 'مرتبات': ws },
      SheetNames: ['مرتبات'],
      // Workbook-level view settings:
      Workbook: { Views: [{ RTL: true }] }
    };

    XLSX.writeFile(wb,
      `مرتبات_الموظفين_لشهر_${this.selectedDate.getFullYear()}_${this.selectedDate.getMonth() + 1}.xlsx`
      , { bookType: 'xlsx', cellStyles: true});
  }
}
