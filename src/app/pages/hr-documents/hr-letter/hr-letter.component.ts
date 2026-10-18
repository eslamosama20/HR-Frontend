import {Component, ElementRef, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DropdownModule} from 'primeng/dropdown';
import {InputTextModule} from 'primeng/inputtext';
import {InputNumberModule} from 'primeng/inputnumber';
import {CalendarModule} from 'primeng/calendar';
import {ButtonModule} from 'primeng/button';
import {ToastModule} from 'primeng/toast';
import {MessageService, PrimeNGConfig} from 'primeng/api';
import {TooltipModule} from 'primeng/tooltip';
import {EmployeeService} from '../../../services/hr/employee.service';
import {PdfUtilsService} from '../../../services/pdf-utils.service';
import primengArTranslations from '../../../utils/primengArTranslations';

export interface HrLetterData {
  employeeId: string;
  employeeName: string;
  nationalId: string;
  jobTitle: string;
  department: string;
  startDate: string;
  basicSalary: number;
  allowances: number;
  totalGrossSalary: number;
  addressedTo: string;
  purpose: string;
  letterDate: Date;
  includeSalaryDetails: boolean;
  notes: string;
}

@Component({
  selector: 'app-hr-letter',
  templateUrl: './hr-letter.component.html',
  styleUrl: './hr-letter.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    CalendarModule,
    ButtonModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class HrLetterComponent implements OnInit {
  @ViewChild('letterPrintArea') letterPrintArea?: ElementRef;

  employeesListSignal = signal<any[]>([]);
  get employeesList() { return this.employeesListSignal(); }

  selectedEmployeeId: string | null = null;
  loading: boolean = false;

  letterForm: HrLetterData = {
    employeeId: '',
    employeeName: '',
    nationalId: '',
    jobTitle: '',
    department: '',
    startDate: '',
    basicSalary: 0,
    allowances: 0,
    totalGrossSalary: 0,
    addressedTo: 'إلى من يهمه الأمر',
    purpose: 'تقديمها للجهات المختصة لإثبات الدخل والعمل',
    letterDate: new Date(),
    includeSalaryDetails: true,
    notes: ''
  };

  addressedToPresets = [
    {label: 'إلى من يهمه الأمر (عام)', value: 'إلى من يهمه الأمر'},
    {label: 'عناية السادة / مسؤولي البنك', value: 'السادة / مسؤولي البنك'},
    {label: 'عناية السادة / مسؤولي السفارة', value: 'السادة / مسؤولي قسم التأشيرات بالسفارة'},
    {label: 'عناية إدارة المرور (تراخيص)', value: 'السادة / مسؤولي إدارة المرور'},
    {label: 'جهة حكومية رسمية', value: 'السادة / مسؤولي الجهات الحكومية المعنية'}
  ];

  isGenerated: boolean = false;

  constructor(
    private employeeService: EmployeeService,
    private pdfUtils: PdfUtilsService,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig
  ) {
    this.primengConfig.setTranslation(primengArTranslations);
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getAll().subscribe({
      next: (data) => {
        const mapped = data.map((e: any) => ({
          label: `${e.deviceId ? '[' + e.deviceId + '] ' : ''}${e.name}${e.jobTitle ? ' - ' + e.jobTitle : ''}`,
          value: e.id,
          raw: e
        }));
        this.employeesListSignal.set(mapped);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل قائمة الموظفين'});
        this.loading = false;
      }
    });
  }

  onEmployeeSelect(): void {
    if (!this.selectedEmployeeId) {
      this.isGenerated = false;
      return;
    }

    const emp = this.employeesList.find(e => e.value === this.selectedEmployeeId)?.raw;
    if (!emp) return;

    const basic = Number(emp.monthlyRate || 0) + Number(emp.supplementaryRate || 0);
    const allowances = Number(emp.livingAllowance || 0) +
                       Number(emp.mealAllowance || 0) +
                       Number(emp.transportAllowance || 0) +
                       Number(emp.housingAllowance || 0) +
                       Number(emp.extraIncrease || 0) +
                       Number(emp.supervisionBonus || 0) +
                       Number(emp.masteryBonus || 0) +
                       Number(emp.regularityBonus || 0);

    const gross = emp.totalGrossSalary ? Number(emp.totalGrossSalary) : (basic + allowances);

    this.letterForm = {
      ...this.letterForm,
      employeeId: emp.id,
      employeeName: emp.name || '',
      nationalId: emp.nationalId || 'غير مسجل',
      jobTitle: emp.jobTitle || 'موظف بالشركة',
      department: emp.department || emp.workshop || 'الإدارة العامة',
      startDate: emp.startDate ? emp.startDate.toString().split('T')[0] : 'تاريخ غير محدد',
      basicSalary: basic,
      allowances: allowances,
      totalGrossSalary: gross > 0 ? gross : basic
    };

    this.isGenerated = true;
    this.messageService.add({
      severity: 'success',
      summary: 'تم بنجاح',
      detail: `تم استيراد بيانات الموظف ${emp.name} وإعداد مسودة الخطاب`
    });
  }

  printLetter(): void {
    if (!this.letterPrintArea?.nativeElement) {
      window.print();
      return;
    }
    const html = this.letterPrintArea.nativeElement.outerHTML;
    this.pdfUtils.printHtml(html, {
      isRtl: true,
      title: `خطاب مفردات مرتب - HR Letter - ${this.letterForm.employeeName}`,
      pageOrientation: 'portrait'
    });
  }

  // Convert numbers to Arabic words representation (simple helper for salaries)
  numberToArabicWords(num: number): string {
    if (!num || num <= 0) return 'صفر';
    const rounded = Math.round(num);
    return `${rounded.toLocaleString('ar-EG')} جنيهاً مصرياً`;
  }
}
