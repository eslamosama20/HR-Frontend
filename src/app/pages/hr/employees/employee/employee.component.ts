import {Component, OnInit, ViewChild, signal} from '@angular/core';
import { ShiftModel } from 'src/app/models/hr/shift.model';
import {EmploymentTypeModel} from "../../../../models/hr/employment-type.model";
import {PermissionModel} from "../../../../models/auth/permission.model";
import {AuthService} from "../../../../modules/auth";
import {MessageService, PrimeNGConfig} from 'primeng/api';
import {TranslateService} from "@ngx-translate/core";
import {EmployeeService} from "../../../../services/hr/employee.service";
import {ShiftService} from "../../../../services/hr/shift.service";
import {TranslationService} from "../../../../modules/i18n";
import {EmploymentTypeService} from "../../../../services/hr/employment-type.service";
import {ActivatedRoute, Router} from "@angular/router";
import {FormBuilder, Validators} from '@angular/forms';
import primengArTranslations from "../../../../utils/primengArTranslations";
import {forkJoin} from "rxjs";
import {formatDateOnly, parseDateOnly, unFormatDateOnly} from "../../../../utils/formatDateOnly";
import {EmployeeModel} from "../../../../models/hr/employee.model";
import {ChartComponent} from "ng-apexcharts";


@Component({
  selector: 'app-employee',
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.scss'
})
export class EmployeeComponent implements OnInit {

  currentDate = new Date();

  selectedDate = null;
  getHighlightColor(date: any): string | null {
    const targetDate = new Date(date.year, date.month, date.day);
    targetDate.setHours(0, 0, 0, 0);
    if (!this.employee) {
      return null;
    }
    const record = this.employee.attendanceRecords.find(record => {
      const attendanceDate = new Date(record.attendanceDate);
      attendanceDate.setHours(0, 0, 0, 0);
      return attendanceDate.getTime() === targetDate.getTime();
    });

    if (!record) {
      return null; // No highlight
    }

    switch (record.attendanceFlag) {
      case 'Present':
        return '#4CAF50'; // Green
      case 'LateEntry':
        return '#FFC107'; // Amber
      case 'EarlyExit':
        return '#03A9F4'; // Light Blue
      case 'Absent':
        return '#F44336'; // Red
      case 'Holiday':
        return '#9C27B0'; // Purple
      case 'OnLeaveWithPermission':
        return '#FF9800'; // Orange
      case 'OnLeaveWithoutPermission':
        return '#ff9864'; // Orange
      case 'Weekend':
        return '#c5c5c5'; // slate
      case 'HalfDay':
        return '#737373'; // slate
      default:
        return null;
    }
  }


  employeeIdSignal = signal<string | null>(null);
  get employeeId() {
    return this.employeeIdSignal();
  }
  set employeeId(value) {
    this.employeeIdSignal.set(value);
  }
  employeeSignal = signal<EmployeeModel>(null);
  get employee() {
    return this.employeeSignal();
  }
  set employee(value) {
    this.employeeSignal.set(value);
  }
  isEditModeSignal = signal<boolean>(false);
  get isEditMode() {
    return this.isEditModeSignal();
  }
  set isEditMode(value) {
    this.isEditModeSignal.set(value);
  }
  isReadOnlySignal = signal<boolean>(false);
  get isReadOnly() {
    return this.isReadOnlySignal();
  }
  set isReadOnly(value) {
    this.isReadOnlySignal.set(value);
  }

  shiftsSignal = signal<ShiftModel[]>([]);
  get shifts() {
    return this.shiftsSignal();
  }
  set shifts(value) {
    this.shiftsSignal.set(value);
    this.shiftsOptions = (value || []).map(shift => ({
      label: shift.name,
      value: shift.id
    }));
  }
  shiftsOptions: { label: string; value: string }[] = [];

  employmentTypeSignal = signal<EmploymentTypeModel[]>([]);
  get employmentTypes() {
    return this.employmentTypeSignal();
  }
  set employmentTypes(value) {
    this.employmentTypeSignal.set(value);
    this.employmentTypesOptions = (value || []).map(employmentType => ({
      label: employmentType.code,
      value: employmentType.id
    }));
  }
  employmentTypesOptions: { label: string; value: string }[] = [];
  employeeFormGroup : any;
  public translate : TranslateService;

  allEmployees: EmployeeModel[] = [];
  isDuplicateCode: boolean = false;
  duplicateEmployeeInfo: string = '';

  loadingSignal=signal(false)
  get loading(){
    return this.loadingSignal()
  }
  set loading(value){
    this.loadingSignal.set(value)
  }
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }
  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private employeeService: EmployeeService,
    private shiftService: ShiftService,
    private employmentTypeService: EmploymentTypeService,
    private route: ActivatedRoute,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
  ) {
    this.translate = translateService;

    this.primengConfig.setTranslation(primengArTranslations);
  }


  ngOnInit(): void {
    this.employeeFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      name: ['', Validators.required],
      phone: [''],
      employmentTypeId: [null, Validators.required],
      shiftId: [null, Validators.required],
      startDate: [new Date(new Date().getFullYear(), new Date().getMonth(), 1), Validators.required],
      endDate: [null],
      monthlyRate: [0, Validators.required],
      supplementaryRate: [0],
      monthlyInsurance: [0],
      factoryType: ['Factory1'],
      leaveBalance: [0],
      deviceId: ['', Validators.required],
      overtimeRateMultiplier: [1.5, Validators.required],
      absentRateMultiplier: [1.5, Validators.required],
      lateRateMultiplier: [1.5, Validators.required],
      // Falcon Factory fields
      department: [''],
      workshop: ['مشترك'],
      jobTitle: [''],
      nationalId: [''],
      address: [''],
      governorate: [''],
      birthDate: [null],
      insuranceNumber: [''],
      insuranceTitle: [''],
      livingAllowance: [500],
      mealAllowance: [500],
      transportAllowance: [500],
      housingAllowance: [0],
      extraIncrease: [0],
      supervisionBonus: [0],
      masteryBonus: [500],
      regularityBonus: [500],
    });

    this.employeeFormGroup.get('deviceId')?.valueChanges.subscribe(() => {
      this.checkDuplicateCode();
    });
    this.employeeFormGroup.get('factoryType')?.valueChanges.subscribe(() => {
      this.checkDuplicateCode();
    });

    this.loadData();
  }

  checkDuplicateCode(): void {
    if (!this.employeeFormGroup) return;
    const rawDeviceId = this.employeeFormGroup.get('deviceId')?.value;
    const currentDeviceId = rawDeviceId !== null && rawDeviceId !== undefined ? rawDeviceId.toString().trim() : '';
    const currentFactory = this.employeeFormGroup.get('factoryType')?.value || 'Factory1';
    const currentId = this.employeeId || this.employeeFormGroup.get('id')?.value;

    if (!currentDeviceId) {
      this.isDuplicateCode = false;
      this.duplicateEmployeeInfo = '';
      this.clearDuplicateError();
      return;
    }

    const duplicate = (this.allEmployees || []).find(emp => {
      if (currentId && emp.id && emp.id.toString().toLowerCase() === currentId.toString().toLowerCase()) {
        return false;
      }
      const empCode = emp.deviceId !== null && emp.deviceId !== undefined ? emp.deviceId.toString().trim() : '';
      const empFactory = emp.factoryType || 'Factory1';
      return empCode !== '' && empCode.toLowerCase() === currentDeviceId.toLowerCase() && empFactory === currentFactory;
    });

    if (duplicate) {
      this.isDuplicateCode = true;
      const factoryLabel = currentFactory === 'Factory1' ? 'المصنع الأول' : currentFactory === 'Factory2' ? 'المصنع الثاني' : 'المصنع الثالث';
      this.duplicateEmployeeInfo = `كود الموظف (${currentDeviceId}) مسجل بالفعل في ${factoryLabel} للموظف: ${duplicate.name}`;
      const control = this.employeeFormGroup.get('deviceId');
      const currentErrors = control?.errors || {};
      control?.setErrors({ ...currentErrors, duplicateCode: true });
    } else {
      this.isDuplicateCode = false;
      this.duplicateEmployeeInfo = '';
      this.clearDuplicateError();
    }
  }

  private clearDuplicateError(): void {
    const control = this.employeeFormGroup?.get('deviceId');
    const errors = control?.errors;
    if (errors && errors['duplicateCode']) {
      delete errors['duplicateCode'];
      control?.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  getNextEmployeeCode(): string {
    if (!this.allEmployees || this.allEmployees.length === 0) {
      return '1';
    }
    let maxCode = 0;
    for (const emp of this.allEmployees) {
      const codeStr = emp.deviceId !== null && emp.deviceId !== undefined ? emp.deviceId.toString().trim() : '';
      const num = parseInt(codeStr, 10);
      if (!isNaN(num) && num > maxCode) {
        maxCode = num;
      }
    }
    return maxCode > 0 ? (maxCode + 1).toString() : '1';
  }

  loadData(): void {
    this.loading = true;
    const employeeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!employeeId;
    forkJoin({
      shifts: this.shiftService.getAll(),
      employmentTypes: this.employmentTypeService.getAll(),
      employees: this.employeeService.getAll(),
    }).subscribe({
      next: ({ shifts, employmentTypes, employees }) => {
        this.shifts = shifts;
        this.employmentTypes = employmentTypes;
        this.allEmployees = employees || [];
        this.shiftsOptions = (shifts || []).map(shift => ({
          label: shift.name,
          value: shift.id
        }));
        this.employmentTypesOptions = (employmentTypes || []).map(employmentType => ({
          label: employmentType.code,
          value: employmentType.id
        }));
        if (this.isEditMode) {
          this.loadMode();
        } else {
          const nextCode = this.getNextEmployeeCode();
          this.employeeFormGroup.patchValue({ deviceId: nextCode });
          this.checkDuplicateCode();
          if (!this.employeeFormGroup.get('shiftId')?.value && this.shiftsOptions.length > 0) {
            this.employeeFormGroup.patchValue({ shiftId: this.shiftsOptions[0].value });
          }
          if (!this.employeeFormGroup.get('employmentTypeId')?.value && this.employmentTypesOptions.length > 0) {
            this.employeeFormGroup.patchValue({ employmentTypeId: this.employmentTypesOptions[0].value });
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: "حدث خطأ أثناء التحميل"
        });
      },
      complete:()=> {
        this.loading = false;
      }
    });
  }
  loadMode() {
    this.employeeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.employeeId;
    if (this.isEditMode) {
      this.loadEmployee(this.employeeId);
    }
  }
  currentEmployeeSignal = signal<EmployeeModel>(null);
  get currentEmployee() {
    return this.currentEmployeeSignal();
  }
  set currentEmployee(value) {
    this.currentEmployeeSignal.set(value);
  }
  loadEmployee(id: string) {
    this.employeeService.getById(id).subscribe({
      next: employee => {
        if (!employee) {
          this.loading = false;
          return;
        }
        this.employee = employee;
        this.currentEmployee = employee;
        let formattedStartDate = null;
        try {
          if (employee.startDate) {
            formattedStartDate = typeof employee.startDate === 'string'
              ? unFormatDateOnly(new Date(employee.startDate))
              : unFormatDateOnly(employee.startDate);
          }
        } catch { }
        let formattedEndDate = null;
        try {
          if (employee.endDate) {
            formattedEndDate = typeof employee.endDate === 'string'
              ? unFormatDateOnly(new Date(employee.endDate))
              : unFormatDateOnly(employee.endDate);
          }
        } catch { }

        let formattedBirthDate = null;
        try {
          if (employee.birthDate) {
            formattedBirthDate = typeof employee.birthDate === 'string'
              ? unFormatDateOnly(new Date(employee.birthDate))
              : unFormatDateOnly(employee.birthDate);
          }
        } catch { }

        const patchData: any = {
          ...employee,
          employmentTypeId: employee.employmentTypeId,
          shiftId: employee.shiftId,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          birthDate: formattedBirthDate
        };
        this.employeeFormGroup.patchValue(patchData);
        this.loading = false;
        this.checkDuplicateCode();
      },
      error: error => {
        console.log('Error Loading Employee', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: "حدث خطأ أثناء التحميل"
        });
      }
    });
  }
  public hasPermission(permission : string): boolean {
    return this.userPermissions?.some(x => x.name === permission)
  }
  isSubmitted: boolean = false;

  get totalGrossSalary(): number {
    if (!this.employeeFormGroup) return 0;
    const v = this.employeeFormGroup.value;
    return (Number(v.monthlyRate) || 0) +
           (Number(v.livingAllowance) || 0) +
           (Number(v.mealAllowance) || 0) +
           (Number(v.transportAllowance) || 0) +
           (Number(v.housingAllowance) || 0) +
           (Number(v.extraIncrease) || 0) +
           (Number(v.supervisionBonus) || 0) +
           (Number(v.masteryBonus) || 0) +
           (Number(v.regularityBonus) || 0);
  }

  get overtimeBaseSalary(): number {
    if (!this.employeeFormGroup) return 0;
    const v = this.employeeFormGroup.value;
    return (Number(v.monthlyRate) || 0) +
           (Number(v.livingAllowance) || 0) +
           (Number(v.mealAllowance) || 0) +
           (Number(v.transportAllowance) || 0);
  }

  get overtimeHourlyRate(): number {
    return Math.round((this.overtimeBaseSalary / 240) * 100) / 100;
  }

  saveEmployee() {
    this.isSubmitted = true;
    this.checkDuplicateCode();
    if (this.isDuplicateCode) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.duplicateEmployeeInfo || "كود الموظف مسجل بالفعل في نفس المصنع"
      });
      return;
    }

    if (this.employeeFormGroup.invalid) {
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحفظ - يرجى مراجعة البيانات المدخلة" });
      return;
    }

    this.loading = true;
    const employeeValues = this.employeeFormGroup.value;

    const rawEmploymentTypeId = employeeValues.employmentTypeId;
    const employmentTypeId = (rawEmploymentTypeId && typeof rawEmploymentTypeId === 'object' && 'value' in rawEmploymentTypeId)
      ? rawEmploymentTypeId.value
      : rawEmploymentTypeId;

    const rawShiftId = employeeValues.shiftId;
    const shiftId = (rawShiftId && typeof rawShiftId === 'object' && 'value' in rawShiftId)
      ? rawShiftId.value
      : rawShiftId;

    const assignFalconFields = (emp: EmployeeModel) => {
      emp.department = employeeValues.department;
      emp.workshop = employeeValues.workshop;
      emp.jobTitle = employeeValues.jobTitle;
      emp.nationalId = employeeValues.nationalId;
      emp.address = employeeValues.address;
      emp.governorate = employeeValues.governorate;
      emp.birthDate = employeeValues.birthDate ?
        typeof employeeValues.birthDate === 'string'
          ? formatDateOnly(parseDateOnly(employeeValues.birthDate))
          : formatDateOnly(employeeValues.birthDate)
        : null;
      emp.insuranceNumber = employeeValues.insuranceNumber;
      emp.insuranceTitle = employeeValues.insuranceTitle;
      emp.livingAllowance = Number(employeeValues.livingAllowance) || 0;
      emp.mealAllowance = Number(employeeValues.mealAllowance) || 0;
      emp.transportAllowance = Number(employeeValues.transportAllowance) || 0;
      emp.housingAllowance = Number(employeeValues.housingAllowance) || 0;
      emp.extraIncrease = Number(employeeValues.extraIncrease) || 0;
      emp.supervisionBonus = Number(employeeValues.supervisionBonus) || 0;
      emp.masteryBonus = Number(employeeValues.masteryBonus) || 0;
      emp.regularityBonus = Number(employeeValues.regularityBonus) || 0;
    };

    if (employeeValues.id) {
      const employee = new EmployeeModel();
      employee.id = employeeValues.id;
      employee.referenceNumber = employeeValues.referenceNumber;
      employee.name = employeeValues.name;
      employee.phone = employeeValues.phone;
      employee.employmentTypeId = employmentTypeId;
      employee.shiftId = shiftId;
      employee.startDate = typeof employeeValues.startDate === 'string'
                                        ? formatDateOnly(parseDateOnly(employeeValues.startDate))
                                        : formatDateOnly(employeeValues.startDate);
      employee.endDate = employeeValues.endDate ?
        typeof employeeValues.endDate === 'string'
          ? formatDateOnly(parseDateOnly(employeeValues.endDate))
          : formatDateOnly(employeeValues.endDate)
        : null;
      employee.monthlyRate = employeeValues.monthlyRate;
      employee.supplementaryRate = employeeValues.supplementaryRate;
      employee.monthlyInsurance = employeeValues.monthlyInsurance;
      employee.factoryType = employeeValues.factoryType;
      employee.leaveBalance = employeeValues.leaveBalance;
      employee.deviceId = employeeValues.deviceId ? employeeValues.deviceId.toString().trim() : '';
      employee.overtimeRateMultiplier = employeeValues.overtimeRateMultiplier ?? 1.5;
      employee.absentRateMultiplier = employeeValues.absentRateMultiplier ?? 1.5;
      employee.lateRateMultiplier = employeeValues.lateRateMultiplier ?? 1.5;
      assignFalconFields(employee);

      this.employeeService.update(employee).subscribe({
        next: res => {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم التعديل بنجاح" });
          this.loadEmployee(this.employeeId);
          this.loading = false;
        },
        error: error => {
          console.log('Error Saving Employee', error);
          const errorMsg = error?.error?.message || error?.error || (typeof error?.error === 'string' ? error.error : null) || "حدث خطأ أثناء التعديل";
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: typeof errorMsg === 'string' ? errorMsg : "حدث خطأ أثناء التعديل" });
          this.loading = false;
        }
      });
    }else{
      const employee = new EmployeeModel();
      employee.referenceNumber = employeeValues.referenceNumber;
      employee.name = employeeValues.name;
      employee.phone = employeeValues.phone;
      employee.employmentTypeId = employmentTypeId;
      employee.shiftId = shiftId;
      employee.startDate = typeof employeeValues.startDate === 'string'
        ? formatDateOnly(parseDateOnly(employeeValues.startDate))
        : formatDateOnly(employeeValues.startDate);
      employee.endDate = employeeValues.endDate ?
          typeof employeeValues.endDate === 'string'
          ? formatDateOnly(parseDateOnly(employeeValues.endDate))
          : formatDateOnly(employeeValues.endDate)
        : null;
      employee.monthlyRate = employeeValues.monthlyRate;
      employee.supplementaryRate = employeeValues.supplementaryRate;
      employee.monthlyInsurance = employeeValues.monthlyInsurance;
      employee.factoryType = employeeValues.factoryType;
      employee.leaveBalance = employeeValues.leaveBalance;
      employee.deviceId = employeeValues.deviceId ? employeeValues.deviceId.toString().trim() : '';
      employee.overtimeRateMultiplier = employeeValues.overtimeRateMultiplier ?? 1.5;
      employee.absentRateMultiplier = employeeValues.absentRateMultiplier ?? 1.5;
      employee.lateRateMultiplier = employeeValues.lateRateMultiplier ?? 1.5;
      assignFalconFields(employee);

      this.employeeService.create(employee).subscribe({
        next: res => {
          console.log('Employee Saved', res);
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الإنشاء بنجاح" });
          this.router.navigate(['/hr/employee/'+res.id]);
          this.loading = false;
        },
        error: error => {
          console.log('Error Saving Employee', error);
          const errorMsg = error?.error?.message || error?.error || (typeof error?.error === 'string' ? error.error : null) || "حدث خطأ أثناء الإنشاء";
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: typeof errorMsg === 'string' ? errorMsg : "حدث خطأ أثناء الإنشاء" });
          this.loading = false;
        }
      });
    }
  }


  navigateToEmployeesPage() {
    this.router.navigate(['/hr/employees']);
  }

}
