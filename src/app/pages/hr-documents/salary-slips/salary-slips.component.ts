import {Component, ElementRef, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {ConfirmationService, MessageService, PrimeNGConfig} from 'primeng/api';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {ToastModule} from 'primeng/toast';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {DropdownModule} from 'primeng/dropdown';
import {InputTextModule} from 'primeng/inputtext';
import {InputNumberModule} from 'primeng/inputnumber';
import {CalendarModule} from 'primeng/calendar';
import {TooltipModule} from 'primeng/tooltip';
import {CardModule} from 'primeng/card';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {AuthService} from '../../../modules/auth';
import {TranslationService} from '../../../modules/i18n';
import primengArTranslations from '../../../utils/primengArTranslations';
import {SalarySlipService} from '../../../services/hr/salary-slip.service';
import {SalarySlipModel} from '../../../models/hr/salary-slip.model';
import {EmployeeService} from '../../../services/hr/employee.service';
import {PaymentCalculatorService} from '../../../services/hr/payment-calculator.service';
import {PdfUtilsService} from '../../../services/pdf-utils.service';
import {formatDateOnly} from '../../../utils/formatDateOnly';
import {forkJoin} from 'rxjs';

export interface CalculatedPayslip {
  employeeId: number;
  deviceId?: string;
  employeeName: string;
  department?: string;
  workshop?: string;
  jobTitle?: string;
  factoryName: string;
  month: string;

  // Earnings (الاستحقاقات)
  basicSalary: number;
  supplementaryRate: number;
  livingAllowance: number;
  mealAllowance: number;
  transportAllowance: number;
  housingAllowance: number;
  extraIncrease: number;
  supervisionBonus: number;
  masteryBonus: number;
  regularityBonus: number;
  otherAllowances: number;
  totalBonuses: number;
  totalSalary: number; // الأجر الشامل

  // Deductions (الاستقطاعات)
  absentDaysCount: number;
  dailyRate: number;
  totalAbsentPenalty: number;
  regularityDeduction: number;
  totalLateHours: number;
  hourlyRate: number;
  totalLateEntryPenalty: number;
  totalLoans: number;
  insurance: number;
  totalPenalties: number;
  totalSubtractedAmount: number;

  // Salary Net Pay
  netPay: number;

  // Overtime (العمل الإضافي)
  overtimeHours: number;
  overtimeHourlyRate: number;
  overtimePayment: number;

  // Final Total Net
  finalTotalNet: number;
}

@Component({
  selector: 'app-salary-slips',
  templateUrl: './salary-slips.component.html',
  styleUrl: './salary-slips.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    CalendarModule,
    TooltipModule,
    CardModule,
    ProgressSpinnerModule
  ],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class SalarySlipsComponent implements OnInit {
  // Employee Selection & Filtering
  employeesListSignal = signal<any[]>([]);
  get employeesList() { return this.employeesListSignal(); }

  selectedEmployeeId: number | null = null;
  selectedDate: Date = new Date();
  maxSelectableDate: Date = new Date();

  // Calculation State
  loadingCalc: boolean = false;
  calculatedPayslipSignal = signal<CalculatedPayslip | null>(null);
  get calculatedPayslip() { return this.calculatedPayslipSignal(); }

  // Manual Archive Table Data
  itemsSignal = signal<SalarySlipModel[]>([]);
  get items() { return this.itemsSignal(); }
  set items(value) { this.itemsSignal.set(value); }

  loadingArchive = false;
  activeTab: 'calculator' | 'archive' = 'calculator';
  archiveSearchValue: string = '';

  get filteredArchiveItems(): SalarySlipModel[] {
    if (!this.items) return [];
    if (!this.archiveSearchValue?.trim()) return this.items;
    const term = this.archiveSearchValue.trim().toLowerCase();
    return this.items.filter(item =>
      (item.employeeName && item.employeeName.toLowerCase().includes(term)) ||
      (item.deviceId && item.deviceId.toString().toLowerCase().includes(term)) ||
      (item.referenceNumber && item.referenceNumber.toLowerCase().includes(term)) ||
      (item.jobTitle && item.jobTitle.toLowerCase().includes(term))
    );
  }

  constructor(
    private primengConfig: PrimeNGConfig,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public itemService: SalarySlipService,
    public employeeService: EmployeeService,
    private paymentCalculatorService: PaymentCalculatorService,
    private pdfUtils: PdfUtilsService
  ) {
    this.primengConfig.setTranslation(primengArTranslations);
  }

  ngOnInit(): void {
    this.maxSelectableDate.setDate(1);
    this.selectedDate = new Date();
    this.selectedDate.setDate(1);
    this.loadEmployees();
    this.loadArchive();
  }

  loadEmployees(): void {
    this.employeeService.getAll().subscribe({
      next: (data) => {
        const mapped = data.map((e: any) => ({
          label: `${e.deviceId ? '[' + e.deviceId + '] ' : ''}${e.name}${e.jobTitle ? ' - ' + e.jobTitle : ''}`,
          value: e.id,
          raw: e
        }));
        this.employeesListSignal.set(mapped);
        this.enrichArchiveItemsWithEmployees();
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل قائمة الموظفين'});
      }
    });
  }

  loadArchive(): void {
    this.loadingArchive = true;
    this.itemService.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.enrichArchiveItemsWithEmployees();
        this.loadingArchive = false;
      },
      error: () => {
        this.loadingArchive = false;
      }
    });
  }

  private enrichArchiveItemsWithEmployees(): void {
    if (!this.items || this.items.length === 0 || !this.employeesList || this.employeesList.length === 0) return;
    this.items = this.items.map(item => {
      const match = this.employeesList.find(e => String(e.value).toLowerCase() === String(item.employeeId).toLowerCase());
      if (match && match.raw) {
        return new SalarySlipModel({
          ...item,
          employeeName: item.employeeName || match.raw.name,
          deviceId: item.deviceId || match.raw.deviceId,
          jobTitle: item.jobTitle || match.raw.jobTitle
        });
      }
      return item;
    });
  }

  calculateSlip(): void {
    if (!this.selectedEmployeeId) {
      this.messageService.add({severity: 'warn', summary: 'تنبيه', detail: 'يرجى اختيار الموظف أولاً'});
      return;
    }
    if (!this.selectedDate) {
      this.messageService.add({severity: 'warn', summary: 'تنبيه', detail: 'يرجى تحديد الشهر والسنة'});
      return;
    }

    this.loadingCalc = true;
    this.calculatedPayslipSignal.set(null);

    const tempDate = new Date(this.selectedDate);
    tempDate.setDate(1);
    const monthStr = formatDateOnly(tempDate);

    // Call both salary and overtime services simultaneously
    forkJoin({
      salary: this.paymentCalculatorService.getPaymentResults(monthStr),
      overtime: this.paymentCalculatorService.getOvertimePaymentResults(monthStr)
    }).subscribe({
      next: ({salary, overtime}) => {
        // Find employee in Factory1, Factory2, or Factory3
        let empSalary: any = null;
        let factoryName = 'المصنع الرئيسي';

        if (salary?.factory1Payments) {
          empSalary = salary.factory1Payments.find(p => p.employeeId === this.selectedEmployeeId);
          if (empSalary) factoryName = 'الصالة / المصنع 1';
        }
        if (!empSalary && salary?.factory2Payments) {
          empSalary = salary.factory2Payments.find(p => p.employeeId === this.selectedEmployeeId);
          if (empSalary) factoryName = 'الصالة / المصنع 2';
        }
        if (!empSalary && salary?.factory3Payments) {
          empSalary = salary.factory3Payments.find(p => p.employeeId === this.selectedEmployeeId);
          if (empSalary) factoryName = 'الصالة / المصنع 3';
        }

        // Find overtime
        let empOvertime: any = null;
        if (overtime?.factory1OvertimePayments) {
          empOvertime = overtime.factory1OvertimePayments.find(p => p.employeeId === this.selectedEmployeeId);
        }
        if (!empOvertime && overtime?.factory2OvertimePayments) {
          empOvertime = overtime.factory2OvertimePayments.find(p => p.employeeId === this.selectedEmployeeId);
        }
        if (!empOvertime && overtime?.factory3OvertimePayments) {
          empOvertime = overtime.factory3OvertimePayments.find(p => p.employeeId === this.selectedEmployeeId);
        }

        const employeeRaw = this.employeesList.find(e => e.value === this.selectedEmployeeId)?.raw;

        if (!empSalary && !empOvertime) {
          this.messageService.add({
            severity: 'info',
            summary: 'تنبيه',
            detail: 'لم يتم العثور على سجلات حضور أو بيانات راتب لهذا الموظف في هذا الشهر'
          });
          this.loadingCalc = false;
          return;
        }

        const basicSalary = empSalary?.monthlyRate || employeeRaw?.monthlyRate || 0;
        const supplementaryRate = empSalary?.supplementaryRate || employeeRaw?.supplementaryRate || 0;
        const livingAllowance = empSalary?.livingAllowance || 0;
        const mealAllowance = empSalary?.mealAllowance || 0;
        const transportAllowance = empSalary?.transportAllowance || 0;
        const housingAllowance = empSalary?.housingAllowance || 0;
        const extraIncrease = empSalary?.extraIncrease || 0;
        const supervisionBonus = empSalary?.supervisionBonus || 0;
        const masteryBonus = empSalary?.masteryBonus || 0;
        const regularityBonus = empSalary?.regularityBonus || 0;
        const otherAllowances = empSalary?.otherAllowances || 0;
        const totalBonuses = empSalary?.totalBonuses || (livingAllowance + mealAllowance + transportAllowance + housingAllowance + extraIncrease + supervisionBonus + masteryBonus + regularityBonus + otherAllowances);
        const totalSalary = empSalary?.totalSalary || (basicSalary + supplementaryRate + totalBonuses);

        const absentDaysCount = empSalary?.absentDaysCount || 0;
        const dailyRate = empSalary?.dailyRate || (basicSalary > 0 ? (basicSalary / 30) : 0);
        const totalAbsentPenalty = empSalary?.totalAbsentPenalty || 0;
        const regularityDeduction = empSalary?.regularityDeduction || 0;
        const totalLateHours = empSalary?.totalLateHours || 0;
        const hourlyRate = empSalary?.hourlyRate || (basicSalary > 0 ? (basicSalary / (30 * 8)) : 0);
        const totalLateEntryPenalty = empSalary?.totalLateEntryPenalty || 0;
        const totalLoans = empSalary?.totalLoans || 0;
        const insurance = empSalary?.insurance || 0;
        const totalPenalties = empSalary?.totalPenalties || 0;
        const totalSubtractedAmount = empSalary?.totalSubtractedAmount || (totalAbsentPenalty + regularityDeduction + totalLateEntryPenalty + totalLoans + insurance + totalPenalties);
        const netPay = empSalary?.netPay || (totalSalary - totalSubtractedAmount);

        const overtimeHours = empOvertime?.overtimeHours || 0;
        const overtimeHourlyRate = empOvertime?.hourlyRate || (empSalary?.overtimeBaseSalary ? (empSalary.overtimeBaseSalary / 240) : hourlyRate);
        const overtimePayment = empOvertime?.overtimePayment || 0;

        const payslip: CalculatedPayslip = {
          employeeId: this.selectedEmployeeId,
          deviceId: empSalary?.deviceId || empOvertime?.deviceId || employeeRaw?.deviceId || '',
          employeeName: empSalary?.employeeName || empOvertime?.employeeName || employeeRaw?.name || '',
          department: empSalary?.department || employeeRaw?.department || '',
          workshop: empSalary?.workshop || employeeRaw?.workshop || '',
          jobTitle: empSalary?.jobTitle || employeeRaw?.jobTitle || '',
          factoryName: factoryName,
          month: monthStr,

          basicSalary,
          supplementaryRate,
          livingAllowance,
          mealAllowance,
          transportAllowance,
          housingAllowance,
          extraIncrease,
          supervisionBonus,
          masteryBonus,
          regularityBonus,
          otherAllowances,
          totalBonuses,
          totalSalary,

          absentDaysCount,
          dailyRate,
          totalAbsentPenalty,
          regularityDeduction,
          totalLateHours,
          hourlyRate,
          totalLateEntryPenalty,
          totalLoans,
          insurance,
          totalPenalties,
          totalSubtractedAmount,

          netPay,

          overtimeHours,
          overtimeHourlyRate,
          overtimePayment,

          finalTotalNet: netPay + overtimePayment
        };

        this.calculatedPayslipSignal.set(payslip);
        this.loadingCalc = false;
        this.messageService.add({severity: 'success', summary: 'تم بنجاح', detail: 'تم استخراج مفردات المرتب والإضافي بنجاح'});
      },
      error: (err) => {
        console.error(err);
        this.loadingCalc = false;
        this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء احتساب مفردات المرتب'});
      }
    });
  }

  @ViewChild('payslipElement') payslipElement?: ElementRef;

  printPayslip(): void {
    if (!this.payslipElement?.nativeElement) {
      window.print();
      return;
    }
    const html = this.payslipElement.nativeElement.outerHTML;
    this.pdfUtils.printHtml(html, {
      isRtl: true,
      title: `مفردات مرتب - ${this.calculatedPayslip?.employeeName || 'موظف'} - ${this.calculatedPayslip?.month || ''}`,
      pageOrientation: 'portrait'
    });
  }

  saveToArchive(): void {
    const slip = this.calculatedPayslip;
    if (!slip) return;

    const payload = new SalarySlipModel({
      employeeId: String(slip.employeeId),
      month: this.selectedDate.getMonth() + 1,
      year: this.selectedDate.getFullYear(),
      basicSalary: slip.basicSalary + slip.supplementaryRate,
      allowances: slip.totalBonuses + slip.overtimePayment,
      deductions: slip.totalSubtractedAmount,
      netSalary: slip.finalTotalNet,
      notes: `تم الاستخراج الآلي - ساعات إضافي: ${slip.overtimeHours} بمبلغ ${slip.overtimePayment}`,
      isPaid: false
    });

    this.itemService.create(payload).subscribe({
      next: () => {
        this.messageService.add({severity: 'success', summary: 'تم الحفظ', detail: 'تم حفظ نسخة من المفردات في سجل الوثائق'});
        this.loadArchive();
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في حفظ نسخة من المفردات'});
      }
    });
  }

  delete(item: SalarySlipModel): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من حذف هذا السجل؟',
      accept: () => {
        this.itemService.delete(item.id!).subscribe({
          next: () => {
            this.messageService.add({severity: 'success', summary: 'تم الحذف', detail: 'تم الحذف بنجاح'});
            this.loadArchive();
          },
          error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في الحذف'})
        });
      }
    });
  }
}
