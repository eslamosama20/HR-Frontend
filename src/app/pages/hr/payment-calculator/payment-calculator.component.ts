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
    // 1) Build header rows as before
    const headerRows = [
      [ 'م','الاسم','الوظيفة','المرتب الأساسي','التكميلي','المكافآت','الأجر المستحق',
        'تفاصيل المستقطع','','','','','','','','',
        'اجمالي المستقطع','صافي المرتب'
      ],
      [ '','','','','','','',
        'غياب','','',
        'التأخيرات','','',
        'السٌلف','التأمينات','الجزاء','',''
      ],
      [ '','','','','','','',
        'عدد الأيام','أجر اليوم','الإجمالي',
        'عدد ساعات التأخير','أجر الساعة','الإجمالي',
        '','','','',''
      ]
    ];

    // 2) Create sheet from headerRows
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(headerRows);

    // 3) Apply merges exactly as before
    ws['!merges'] = [
      { s:{r:0,c:0},e:{r:2,c:0} }, { s:{r:0,c:1},e:{r:2,c:1} },
      { s:{r:0,c:2},e:{r:2,c:2} }, { s:{r:0,c:3},e:{r:2,c:3} },
      { s:{r:0,c:4},e:{r:2,c:4} }, { s:{r:0,c:5},e:{r:2,c:5} },
      { s:{r:0,c:6},e:{r:2,c:6} },
      { s:{r:0,c:7},e:{r:0,c:15} },
      { s:{r:1,c:7},e:{r:1,c:9} }, { s:{r:1,c:10},e:{r:1,c:12} },
      { s:{r:1,c:13},e:{r:2,c:13} }, { s:{r:1,c:14},e:{r:2,c:14} },
      { s:{r:1,c:15},e:{r:2,c:15} },
      { s:{r:0,c:16},e:{r:2,c:16} }, { s:{r:0,c:17},e:{r:2,c:17} },
    ];

    // 4) Append data rows under the header (row index 3)
    let data = []
    if (factory === 1) {
      data = this.paymentResults.factory1Payments.map((pr,index) => ([
        index, pr.employeeName, pr.employeeTypeName,
        pr.monthlyRate, pr.supplementaryRate, pr.totalBonuses, pr.totalSalary,
        pr.absentDaysCount, pr.dailyRate, pr.totalAbsentPenalty,
        pr.totalLateHours, pr.hourlyRate, pr.totalLateEntryPenalty,
        pr.totalLoans, pr.insurance, pr.totalPenalties,
        pr.totalSubtractedAmount, pr.netPay
      ]));
    } else if (factory === 2) {
      data = this.paymentResults.factory2Payments.map((pr,index) => ([
        index, pr.employeeName, pr.employeeTypeName,
        pr.monthlyRate, pr.supplementaryRate, pr.totalBonuses, pr.totalSalary,
        pr.absentDaysCount, pr.dailyRate, pr.totalAbsentPenalty,
        pr.totalLateHours, pr.hourlyRate, pr.totalLateEntryPenalty,
        pr.totalLoans, pr.insurance, pr.totalPenalties,
        pr.totalSubtractedAmount, pr.netPay
      ]));
    } else {
      data = this.paymentResults.factory3Payments.map((pr,index) => ([
        index, pr.employeeName, pr.employeeTypeName,
        pr.monthlyRate, pr.supplementaryRate, pr.totalBonuses, pr.totalSalary,
        pr.absentDaysCount, pr.dailyRate, pr.totalAbsentPenalty,
        pr.totalLateHours, pr.hourlyRate, pr.totalLateEntryPenalty,
        pr.totalLoans, pr.insurance, pr.totalPenalties,
        pr.totalSubtractedAmount, pr.netPay
      ]));
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
