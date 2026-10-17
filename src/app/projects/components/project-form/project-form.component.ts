import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProjectService } from '../../services/project.service';
import { CreateProjectRequest, UpdateProjectRequest, ProjectCheck } from '../../models/project.model';
import { MessageService } from 'primeng/api';
import { CompanyDetailsService } from '../../../services/inventory/company-details.service';
import { SupplierDetailsService } from '../../../services/inventory/supplier-details.service';
import { SupplierDetailsModel } from '../../../models/inventory/supplierDetails.model';
import { TreasuryService } from '../../../services/treasury/treasury.service';
import { MainAccountService } from '../../../services/accounting/main-account.service';
import { CustomerProfileService } from '../../../services/accounting/customer-profile.service';
import { AuthService } from '../../../modules/auth';
import { PERMISSIONS } from '../../../config/permissions';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  projectForm: FormGroup;
  isEditMode: boolean = false;
  projectId: string = '';
  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
  loading: boolean = false;
  submitted: boolean = false;
  statuses: string[] = [];
  companies: any[] = [];
  treasuries: any[] = [];
  cashTreasuries: any[] = [];
  bankAccounts: any[] = [];
  mainAccounts: any[] = [];
  checks: ProjectCheck[] = [];
  milestones: any[] = [];
  projectCustomers: any[] = [];
  departmentOptions: any[] = [];
  countries: string[] = [
    'المملكة العربية السعودية', 'جمهورية مصر العربية', 'السودان', 'اليمن', 'الأردن', 'سوريا', 'لبنان', 'فلسطين',
    'العراق', 'الكويت', 'الإمارات العربية المتحدة', 'قطر', 'البحرين', 'سلطنة عمان', 'ليبيا', 'تونس',
    'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'جيبوتي', 'جزر القمر',
    'ماليزيا', 'إندونيسيا', 'كوسوفو', 'تركيا', 'باكستان', 'بنجلاديش', 'الهند',
    'أفغانستان', 'ألبانيا', 'البوسنة والهرسك', 'تنزانيا', 'نيجيريا', 'السنغال', 'كينيا',
    'أوغندا', 'غانا', 'تشاد', 'مالي', 'النيجر', 'أفريقيا'
  ];

  get countryOptions() {
    return this.countries.map(c => ({
      label: c,
      value: c
    }));
  }
  executingCompanies: string[] = [];
  allSuppliers: SupplierDetailsModel[] = [];
  paymentMethodOptions = [
    { value: 1, label: 'نقدي' },
    { value: 2, label: 'شيك' },
    { value: 4, label: 'تحويل بنكي' },
    { value: 3, label: 'بطاقة' }
  ];

  profitTypeOptions = [
    { label: '%', value: 'percentage' },
    { label: 'ريال', value: 'value' }
  ];

  solvencyOptions = [
    { label: 'نعم', value: true },
    { label: 'لا', value: false }
  ];

  get profitFormType(): string {
    return this.projectForm?.get('profitType')?.value || 'percentage';
  }

  deletedChecks: { id: string; reason: string }[] = [];
  cancellationDialogVisible: boolean = false;
  cancellationReason: string = '';
  targetCheckIndex: number | null = null;
  isFormDisabled: boolean = false;

  addStatusDialogVisible: boolean = false;
  newStatusName: string = '';

  openAddStatusModal(): void {
    this.newStatusName = '';
    this.addStatusDialogVisible = true;
  }

  saveNewStatus(): void {
    const trimmed = this.newStatusName ? this.newStatusName.trim() : '';
    if (!trimmed) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إدخال اسم الحالة'
      });
      return;
    }

    this.projectService.addCustomStatus(trimmed).subscribe(statuses => {
      this.statuses = statuses;
      this.projectForm.patchValue({ status: trimmed });
      this.addStatusDialogVisible = false;
      this.newStatusName = '';

      this.messageService.add({
        severity: 'success',
        summary: 'تمت الإضافة',
        detail: `تم إضافة الحالة الجديدة "${trimmed}" واختيارها بنجاح`
      });
      this.cdr.detectChanges();
    });
  }

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private companyDetailsService: CompanyDetailsService,
    private supplierDetailsService: SupplierDetailsService,
    private treasuryService: TreasuryService,
    private mainAccountService: MainAccountService,
    private customerProfileService: CustomerProfileService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    this.projectForm = this.fb.group({
      projectName: ['', [Validators.required, Validators.maxLength(500)]],
      projectNumber: ['', Validators.maxLength(100)],
      fileNumber: ['', Validators.maxLength(100)],
      status: ['جديد', Validators.required],
      isActive: [true],
      isFinancialSolvency: [false],
      totalAmount: [null, [Validators.min(0)]],
      executionAmount: [null, [Validators.min(0)]],
      profitPercentage: [null, [Validators.min(0), Validators.max(100)]],
      profitType: ['percentage'],
      profitInput: [null],
      companyDetailsId: [null],
      country: [null],
      countriesList: [[]],
      commissionPercentage: [null, [Validators.min(0), Validators.max(100)]],
      clearingDetails: ['', Validators.maxLength(1000)],
      departmentName: ['', Validators.maxLength(200)],
      supervisingEntityName: ['', Validators.maxLength(200)],
      executingCompanyName: ['', Validators.maxLength(200)],
      quoteNumber: ['', Validators.maxLength(100)],
      quoteDate: [null],
      assignmentNumber: ['', Validators.maxLength(100)],
      assignmentApprovalDate: [null],
      executionDuration: [null, [Validators.min(0)]],
      executionDurationUnit: ['Day']
    });
    
    // حساب المبالغ والنسب تلقائياً عند تغيير أي منها
    this.projectForm.get('totalAmount')?.valueChanges.subscribe(() => {
      this.calculateOnTotalAmountChange();
    });
    
    this.projectForm.get('executionAmount')?.valueChanges.subscribe(() => {
      this.calculateOnExecutionAmountChange();
    });

    this.projectForm.get('profitInput')?.valueChanges.subscribe(() => {
      this.calculateOnProfitInputChange();
    });

    this.projectForm.get('countriesList')?.valueChanges.subscribe((selectedCountries: string[]) => {
      let countryStr = '';
      if (selectedCountries && selectedCountries.length === this.countries.length) {
        countryStr = 'جميع الدول';
      } else if (selectedCountries && selectedCountries.length > 0) {
        countryStr = selectedCountries.join(', ');
      }
      this.projectForm.get('country')?.setValue(countryStr, { emitEvent: false });
      this.filterExecutingCompanies(selectedCountries);
    });

    this.projectForm.get('supervisingEntityName')?.valueChanges.subscribe((entityName) => {
      this.onSupervisingEntityChange(entityName);
    });

    this.projectForm.get('status')?.valueChanges.subscribe((statusVal) => {
      this.checkStatusAndDisableForm(statusVal);
    });

    this.projectForm.get('executionDurationUnit')?.valueChanges.subscribe((newUnit) => {
      if (this.milestones && this.milestones.length > 0 && newUnit) {
        this.milestones.forEach(m => {
          m.durationUnit = newUnit;
        });
        this.messageService.add({
          severity: 'info',
          summary: 'تزامن وحدة مدة المراحل',
          detail: 'تم تحديث وحدة جميع مراحل التنفيذ تلقائياً لتطابق وحدة مدة التنفيذ الجديدة للمشروع'
        });
      }
    });

    this.projectForm.get('executionDuration')?.valueChanges.subscribe((newDuration) => {
      if (this.milestones && this.milestones.length > 0 && newDuration) {
        this.messageService.add({
          severity: 'warn',
          summary: 'تنبيه مدة المراحل',
          detail: 'تم تغيير مدة التنفيذ الإجمالية للمشروع، يرجى مراجعة وتعديل مدد المراحل لتتطابق مع المدة الإجمالية الجديدة.'
        });
      }
    });
  }

  checkStatusAndDisableForm(statusVal: any): void {
    if (!statusVal) {
      this.isFormDisabled = false;
      return;
    }
    const val = statusVal.toString().trim().toLowerCase();
    // 'معلق' / 'ملغي' / 'مؤرشف' or 'onhold' / 'cancelled' / 'suspended' / 'archived'
    if (val === 'معلق' || val === 'ملغي' || val === 'مؤرشف' || val === 'onhold' || val === 'cancelled' || val === 'suspended' || val === 'archived') {
      this.isFormDisabled = true;
      Object.keys(this.projectForm.controls).forEach(key => {
        if (key !== 'status') {
          this.projectForm.get(key)?.disable({ emitEvent: false });
        }
      });
    } else {
      this.isFormDisabled = false;
      Object.keys(this.projectForm.controls).forEach(key => {
        this.projectForm.get(key)?.enable({ emitEvent: false });
      });
    }
  }

  ngOnInit(): void {
    this.projectService.getStatuses().subscribe(statuses => {
      this.statuses = statuses;
      this.cdr.detectChanges();
    });
    this.loadCompanies();
    this.loadSuppliers();
    this.loadTreasuries();
    this.loadMainAccounts();
    this.loadProjectCustomers();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.projectId = params['id'];
        this.loadProject();
      }
    });
  }

  loadTreasuries(): void {
    forkJoin([
      this.treasuryService.getAll().pipe(catchError(() => of([]))),
      this.treasuryService.getAllFrontal().pipe(catchError(() => of([])))
    ]).subscribe({
      next: ([regular, frontal]) => {
        const combined = [...(regular || []), ...(frontal || [])];
        const uniqueMap = new Map();
        combined.forEach((t: any) => {
          const key = t.id || t.name;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, { id: t.id, name: t.name || t.arabicName });
          }
        });
        this.cashTreasuries = Array.from(uniqueMap.values());
        this.treasuries = this.cashTreasuries;
      },
      error: (err) => {
        console.error('Error loading cash treasuries:', err);
      }
    });

    forkJoin([
      this.treasuryService.getAllGeneralBankAccounts().pipe(catchError(() => of([]))),
      this.treasuryService.getAllFrontalGeneralBankAccounts().pipe(catchError(() => of([])))
    ]).subscribe({
      next: ([regular, frontal]) => {
        const combined = [...(regular || []), ...(frontal || [])];
        const uniqueMap = new Map();
        combined.forEach((b: any) => {
          const key = b.id || b.accountName || b.bankName;
          if (key && !uniqueMap.has(key)) {
            const displayName = b.accountName
              ? (b.bankName ? `${b.accountName} - ${b.bankName}` : b.accountName)
              : (b.bankName || 'حساب بنكي');
            uniqueMap.set(key, { id: b.id, name: displayName });
          }
        });
        this.bankAccounts = Array.from(uniqueMap.values());
      },
      error: (err) => {
        console.error('Error loading bank accounts:', err);
      }
    });
  }

  getTreasuryOptionsForCheck(check: any): any[] {
    const isCash = Number(check.paymentMethodType) === 1;
    if (isCash) {
      return this.cashTreasuries.length > 0 ? this.cashTreasuries : this.treasuries;
    } else {
      return this.bankAccounts.length > 0 ? this.bankAccounts : this.treasuries;
    }
  }

  onCheckPaymentMethodChange(check: any): void {
    const options = this.getTreasuryOptionsForCheck(check);
    if (options && options.length > 0) {
      if (!options.some(opt => opt.id === check.treasuryId)) {
        check.treasuryId = options[0].id;
      }
    }
  }

  loadMainAccounts(): void {
    this.mainAccountService.getAll().subscribe({
      next: (res) => {
        this.mainAccounts = res || [];
      },
      error: (err) => {
        console.error('Error loading main accounts:', err);
      }
    });
  }

  loadCompanies(): void {
    this.companyDetailsService.getAll().subscribe({
      next: (res) => {
        this.companies = res || [];
      },
      error: (err) => {
        console.error('Error loading companies:', err);
      }
    });
  }

  loadSuppliers(): void {
    this.supplierDetailsService.getAll().subscribe({
      next: (res) => {
        this.allSuppliers = (res || []).map(sd => {
          let country = sd.country || '';
          let street = sd.street || '';
          let city = sd.city || '';
          let zipCode = sd.zipCode || '';

          if (sd.address) {
            let addr = sd.address;
            while (typeof addr === 'string') {
              try {
                const parsed = JSON.parse(addr);
                if (parsed === addr) break;
                addr = parsed;
              } catch { break; }
            }

            if (typeof addr === 'object' && addr !== null) {
              street = addr.street || street;
              city = addr.city || city;
              country = addr.country || country;
              zipCode = addr.zipCode || zipCode;
            } else if (typeof sd.address === 'string') {
              const parts = sd.address.split(',').map(s => s.trim());
              if (parts.length >= 3) {
                street = parts[0] || street;
                city = parts[1] || city;
                country = parts.slice(2, parts.length - 1).join(', ') || parts[2] || country;
                zipCode = parts[parts.length - 1] || zipCode;
              } else if (parts.length > 0 && !country) {
                country = sd.address;
              }
            }
          }

          sd.street = street;
          sd.city = city;
          sd.country = country;
          sd.zipCode = zipCode;
          return sd;
        });
        const currentCountriesList = this.projectForm.get('countriesList')?.value || this.projectForm.get('country')?.value;
        this.filterExecutingCompanies(currentCountriesList);
      },
      error: (err) => {
        console.error('Error loading suppliers:', err);
      }
    });
  }

  loadProjectCustomers(): void {
    this.customerProfileService.getAll().subscribe({
      next: (res: any) => {
        this.projectCustomers = (res || []).filter((c: any) => c.isForProjects === true);
        this.syncDepartmentsOnEdit();
        this.filterExecutingCompanies(this.projectForm?.get('countriesList')?.value || this.projectForm?.get('country')?.value);
      },
      error: (err) => {
        console.error('Error loading project customers:', err);
      }
    });
  }

  onSupervisingEntityChange(entityName: string): void {
    this.departmentOptions = [];
    
    if (!entityName) {
      this.projectForm.get('departmentName')?.setValue('', { emitEvent: false });
      return;
    }

    const selectedCust = this.projectCustomers.find(c => c.arabicName === entityName || c.englishName === entityName);
    if (selectedCust && selectedCust.departments) {
      this.departmentOptions = selectedCust.departments.map((d: any) => ({
        label: d.nameAr,
        value: d.nameAr
      }));
    }

    // Keep departmentName if it is still valid in options, otherwise clear it.
    const currentDeptName = this.projectForm.get('departmentName')?.value;
    if (currentDeptName && !this.departmentOptions.some(opt => opt.value === currentDeptName)) {
      this.projectForm.get('departmentName')?.setValue('', { emitEvent: false });
    }
  }

  syncDepartmentsOnEdit(): void {
    const supervisingEntityName = this.projectForm.get('supervisingEntityName')?.value;
    if (supervisingEntityName) {
      const selectedCust = this.projectCustomers.find(c => c.arabicName === supervisingEntityName || c.englishName === supervisingEntityName);
      if (selectedCust && selectedCust.departments) {
        this.departmentOptions = selectedCust.departments.map((d: any) => ({
          label: d.nameAr,
          value: d.nameAr
        }));
      }
    }
  }

  filterExecutingCompanies(countriesVal: any): void {
    const customerNames = (this.projectCustomers || [])
      .map((c: any) => c.arabicName || c.englishName)
      .filter((name: string) => !!name);

    if (!this.allSuppliers || this.allSuppliers.length === 0) {
      this.executingCompanies = Array.from(new Set(customerNames));
      return;
    }

    let selectedList: string[] = [];
    if (Array.isArray(countriesVal)) {
      selectedList = countriesVal.filter(c => !!c).map(c => c.trim());
    } else if (typeof countriesVal === 'string' && countriesVal.trim()) {
      selectedList = countriesVal.split(/[,،\n]+/).map(s => s.trim()).filter(s => !!s);
    }

    let supplierNames: string[] = [];

    if (selectedList.length === 0) {
      supplierNames = this.allSuppliers.map(s => s.arabicName).filter(name => !!name);
    } else {
      const isAllSelected = selectedList.length === this.countries.length || selectedList.includes('جميع الدول');

      supplierNames = this.allSuppliers
        .filter(supplier => {
          if (!supplier.country) return true;
          const sCountry = supplier.country.trim();

          if (sCountry === 'جميع الدول' || isAllSelected) return true;

          const supplierCountries = sCountry.split(/[,،\n]+/).map(c => c.trim()).filter(c => !!c);

          return selectedList.some(selected => {
            if (!selected) return false;
            return supplierCountries.some(sc => {
              if (!sc) return false;
              if (sc === selected || sc.includes(selected) || selected.includes(sc)) return true;

              const isEgyptSupplier = sc.includes('مصر') || sc.includes('Egypt');
              const isEgyptSelected = selected.includes('مصر') || selected.includes('Egypt');
              if (isEgyptSupplier && isEgyptSelected) return true;

              const isSaudiSupplier = sc.includes('سعود') || sc.includes('KSA') || sc.includes('Saudi');
              const isSaudiSelected = selected.includes('سعود') || selected.includes('KSA') || selected.includes('Saudi');
              if (isSaudiSupplier && isSaudiSelected) return true;

              const isUaeSupplier = sc.includes('إمارات') || sc.includes('امارات') || sc.includes('UAE');
              const isUaeSelected = selected.includes('إمارات') || selected.includes('امارات') || selected.includes('UAE');
              if (isUaeSupplier && isUaeSelected) return true;

              return false;
            });
          });
        })
        .map(s => s.arabicName)
        .filter(name => !!name);
    }

    const combined = [...supplierNames, ...customerNames];
    this.executingCompanies = Array.from(new Set(combined));
  }

  normalizeUnit(unit: string | null | undefined): string {
    if (!unit) return 'Day';
    const u = unit.toString().trim().toLowerCase();
    if (u === 'day' || u === 'يوم') return 'Day';
    if (u === 'week' || u === 'أسبوع' || u === 'اسبوع') return 'Week';
    if (u === 'month' || u === 'شهر') return 'Month';
    if (u === 'year' || u === 'سنة' || u === 'عام') return 'Year';
    return unit;
  }

  loadProject(): void {
    this.loading = true;
    this.projectService.getDetails(this.projectId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          let currentStatus = response.data.status || 'جديد';

          const savedCountryStr = response.data.country || '';
          let initialCountriesList: string[] = [];
          if (savedCountryStr === 'جميع الدول') {
            initialCountriesList = [...this.countries];
          } else if (savedCountryStr) {
            initialCountriesList = savedCountryStr.split(',').map(s => s.trim()).filter(s => !!s);
          }

          this.projectForm.patchValue({
            projectName: response.data.projectName,
            projectNumber: response.data.projectNumber,
            fileNumber: response.data.fileNumber,
            status: currentStatus,
            isActive: response.data.isActive,
            isFinancialSolvency: response.data.isFinancialSolvency,
            totalAmount: response.data.totalAmount,
            executionAmount: response.data.executionAmount,
            profitPercentage: response.data.profitPercentage,
            profitType: 'percentage',
            profitInput: response.data.profitPercentage,
            companyDetailsId: response.data.companyDetailsId,
            country: response.data.country,
            countriesList: initialCountriesList,
            commissionPercentage: response.data.commissionPercentage,
            clearingDetails: response.data.clearingDetails,
            departmentName: response.data.departmentName,
            supervisingEntityName: response.data.supervisingEntityName,
            executingCompanyName: response.data.executingCompanyName,
            quoteNumber: response.data.quoteNumber,
            quoteDate: response.data.quoteDate ? new Date(response.data.quoteDate) : null,
            assignmentNumber: response.data.assignmentNumber,
            assignmentApprovalDate: response.data.assignmentApprovalDate ? new Date(response.data.assignmentApprovalDate) : null,
            executionDuration: response.data.executionDuration,
            executionDurationUnit: this.normalizeUnit(response.data.executionDurationUnit)
          });

          this.filterExecutingCompanies(initialCountriesList);
          
          if (response.data.checks) {
            this.checks = response.data.checks.map(c => {
              const checkReceiptDate = c.checkReceiptDate ? new Date(c.checkReceiptDate) : null;
              return {
                ...c,
                checkReceiptDate,
                voucherNumber: c.voucherNumber,
                transactionNumber: c.transactionNumber,
                bankReferenceNumber: c.bankReferenceNumber,
                checkNumberDetail: c.checkNumberDetail
              };
            });
          }

          if (response.data.milestones) {
            this.milestones = response.data.milestones.map((m: any) => {
              let unit = m.durationUnit || 'Month';
              if (typeof unit === 'string') {
                unit = unit.trim();
                const lower = unit.toLowerCase();
                if (lower === 'day') unit = 'Day';
                else if (lower === 'week') unit = 'Week';
                else if (lower === 'month') unit = 'Month';
                else if (lower === 'year') unit = 'Year';
              }
              return {
                ...m,
                durationUnit: unit,
                completionDate: m.completionDate ? new Date(m.completionDate) : null,
                targetStartDate: m.targetStartDate ? new Date(m.targetStartDate) : null,
                targetEndDate: m.targetEndDate ? new Date(m.targetEndDate) : null
              };
            });
          }
          
          this.filterExecutingCompanies(initialCountriesList);
          this.checkStatusAndDisableForm(currentStatus);
          this.projectForm.get('status')?.setValue(currentStatus);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: response.message
          });
          this.cancel();
        }
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل بيانات المشروع'
        });
        this.loading = false;
        this.cancel();
      }
    });
  }

  getChecksTotalAmount(): number {
    return this.checks.reduce((sum, c) => sum + (Number(c.checkAmount) || 0), 0);
  }

  addCheck(): void {
    this.checks.push({
      checkNumber: '',
      checkAmount: 0,
      checkReceiptDate: new Date(),
      treasuryId: '',
      mainAccountId: '',
      paymentMethodType: 1 // Default to Cash
    });
  }

  removeCheck(index: number): void {
    const check = this.checks[index];
    if (check && check.id) {
      this.targetCheckIndex = index;
      this.cancellationReason = '';
      this.cancellationDialogVisible = true;
    } else {
      this.checks.splice(index, 1);
    }
  }

  confirmCheckCancellation(): void {
    if (this.targetCheckIndex !== null) {
      const check = this.checks[this.targetCheckIndex];
      if (check && check.id) {
        this.deletedChecks.push({
          id: check.id,
          reason: this.cancellationReason.trim() || 'إلغاء دفعة المشروع'
        });
      }
      this.checks.splice(this.targetCheckIndex, 1);
      this.targetCheckIndex = null;
    }
    this.cancellationDialogVisible = false;
  }

  private formatDateToLocal(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSubmit(redirectToDetails: boolean = false): void {
    this.submitted = true;

    if (this.projectForm.invalid) {
      return;
    }

    const checksTotal = this.getChecksTotalAmount();
    const totalAmount = this.projectForm.get('totalAmount')?.value || 0;
    if (checksTotal > totalAmount) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'إجمالي مبالغ الدفعات لا يمكن أن يتجاوز المبلغ الإجمالي للمشروع'
      });
      return;
    }

    // Pre-process checks to set fallback checkNumber if empty and format local dates
    const formattedChecks = this.checks.map((c, i) => ({
      ...c,
      checkNumber: c.checkNumber || ('PMT-' + new Date().getTime() + '-' + i),
      checkReceiptDate: c.checkReceiptDate ? this.formatDateToLocal(c.checkReceiptDate) : null
    }));

    // Validate that all checks have checkNumber, checkAmount, checkReceiptDate, treasuryId, mainAccountId, paymentMethodType
    for (let i = 0; i < formattedChecks.length; i++) {
      const c = formattedChecks[i];
      if (!c.checkNumber || c.checkAmount <= 0 || !c.checkReceiptDate || !c.treasuryId || !c.mainAccountId || !c.paymentMethodType) {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'يرجى ملء جميع حقول الدفعات والتأكد أن المبالغ أكبر من صفر واختيار طريقة الدفع'
        });
        return;
      }
    }

    this.loading = true;

    const rawVal = this.projectForm.getRawValue();
    const processedFormValues = {
      ...rawVal,
      quoteDate: rawVal.quoteDate ? this.formatDateToLocal(rawVal.quoteDate) : null,
      assignmentApprovalDate: rawVal.assignmentApprovalDate ? this.formatDateToLocal(rawVal.assignmentApprovalDate) : null
    };

    if (this.isEditMode) {
      const updateRequest: UpdateProjectRequest = {
        id: this.projectId,
        ...processedFormValues,
        checks: formattedChecks,
        deletedChecks: this.deletedChecks,
        milestones: this.milestones
      };

      this.projectService.update(this.projectId, updateRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم تحديث المشروع بنجاح'
            });
            const currentStatus = this.projectForm.get('status')?.value;
            if (currentStatus === 'مؤرشف') {
              this.router.navigate(['/projects/archived']);
            } else if (redirectToDetails) {
              this.router.navigate(['/projects', this.projectId]);
            } else {
              this.router.navigate(['/projects']);
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.error || error?.error?.message || 'حدث خطأ أثناء تحديث المشروع'
          });
          this.loading = false;
        }
      });
    } else {
      const createRequest: CreateProjectRequest = {
        ...processedFormValues,
        profitPercentage: this.projectForm.get('profitPercentage')?.value,
        checks: formattedChecks,
        milestones: this.milestones
      };

      this.projectService.create(createRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم إنشاء المشروع بنجاح'
            });
            const createdProjectId = response.data?.id;
            const currentStatus = this.projectForm.get('status')?.value;
            if (currentStatus === 'مؤرشف') {
              this.router.navigate(['/projects/archived']);
            } else if (redirectToDetails && createdProjectId) {
              this.router.navigate(['/projects', createdProjectId]);
            } else {
              this.router.navigate(['/projects']);
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.error || error?.error?.message || 'حدث خطأ أثناء إنشاء المشروع'
          });
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/projects']);
  }

  onProfitTypeChange(): void {
    const totalAmount = this.projectForm.get('totalAmount')?.value || 0;
    const executionAmount = this.projectForm.get('executionAmount')?.value || 0;
    const profitType = this.projectForm.get('profitType')?.value;

    if (totalAmount > 0) {
      const profit = totalAmount - executionAmount;
      if (profitType === 'percentage') {
        const pct = (profit / totalAmount) * 100;
        this.projectForm.patchValue({
          profitInput: parseFloat(pct.toFixed(2)),
          profitPercentage: parseFloat(pct.toFixed(2))
        }, { emitEvent: false });
      } else {
        this.projectForm.patchValue({
          profitInput: parseFloat(profit.toFixed(2)),
          profitPercentage: parseFloat(((profit / totalAmount) * 100).toFixed(2))
        }, { emitEvent: false });
      }
    }
  }

  calculateOnTotalAmountChange(): void {
    const totalAmount = this.projectForm.get('totalAmount')?.value;
    const profitInput = this.projectForm.get('profitInput')?.value;
    const profitType = this.projectForm.get('profitType')?.value;
    const executionAmount = this.projectForm.get('executionAmount')?.value;
    
    if (totalAmount && totalAmount > 0) {
      if (profitInput !== null && profitInput !== undefined && profitInput !== '') {
        if (profitType === 'percentage') {
          const calculatedExecution = totalAmount * (1 - (profitInput / 100));
          this.projectForm.patchValue({
            executionAmount: parseFloat(calculatedExecution.toFixed(2)),
            profitPercentage: profitInput
          }, { emitEvent: false });
        } else {
          const calculatedExecution = totalAmount - profitInput;
          const calculatedPct = (profitInput / totalAmount) * 100;
          this.projectForm.patchValue({
            executionAmount: parseFloat(calculatedExecution.toFixed(2)),
            profitPercentage: parseFloat(calculatedPct.toFixed(2))
          }, { emitEvent: false });
        }
      } else if (executionAmount !== null && executionAmount !== undefined && executionAmount !== '') {
        const profit = totalAmount - executionAmount;
        if (profitType === 'percentage') {
          const calculatedProfitPercentage = (profit / totalAmount) * 100;
          this.projectForm.patchValue({
            profitInput: parseFloat(calculatedProfitPercentage.toFixed(2)),
            profitPercentage: parseFloat(calculatedProfitPercentage.toFixed(2))
          }, { emitEvent: false });
        } else {
          this.projectForm.patchValue({
            profitInput: parseFloat(profit.toFixed(2)),
            profitPercentage: parseFloat(((profit / totalAmount) * 100).toFixed(2))
          }, { emitEvent: false });
        }
      }
    }
  }

  calculateOnExecutionAmountChange(): void {
    const totalAmount = this.projectForm.get('totalAmount')?.value;
    const executionAmount = this.projectForm.get('executionAmount')?.value;
    const profitType = this.projectForm.get('profitType')?.value;
    
    if (totalAmount && executionAmount && totalAmount > 0) {
      const profit = totalAmount - executionAmount;
      const profitPercentage = (profit / totalAmount) * 100;
      
      if (profitType === 'percentage') {
        this.projectForm.patchValue({
          profitInput: parseFloat(profitPercentage.toFixed(2)),
          profitPercentage: parseFloat(profitPercentage.toFixed(2))
        }, { emitEvent: false });
      } else {
        this.projectForm.patchValue({
          profitInput: parseFloat(profit.toFixed(2)),
          profitPercentage: parseFloat(profitPercentage.toFixed(2))
        }, { emitEvent: false });
      }
    }
  }

  calculateOnProfitInputChange(): void {
    const totalAmount = this.projectForm.get('totalAmount')?.value;
    const profitInput = this.projectForm.get('profitInput')?.value;
    const profitType = this.projectForm.get('profitType')?.value;
    
    if (totalAmount && totalAmount > 0 && profitInput !== null && profitInput !== undefined && profitInput !== '') {
      if (profitType === 'percentage') {
        const executionAmount = totalAmount * (1 - (profitInput / 100));
        this.projectForm.patchValue({
          executionAmount: parseFloat(executionAmount.toFixed(2)),
          profitPercentage: profitInput
        }, { emitEvent: false });
      } else {
        const executionAmount = totalAmount - profitInput;
        const profitPercentage = (profitInput / totalAmount) * 100;
        this.projectForm.patchValue({
          executionAmount: parseFloat(executionAmount.toFixed(2)),
          profitPercentage: parseFloat(profitPercentage.toFixed(2))
        }, { emitEvent: false });
      }
    }
  }

  addMilestone(): void {
    const nextSeq = this.milestones.length + 1;
    this.milestones.push({
      milestoneName: '',
      duration: 1,
      durationUnit: 'Month',
      sequenceOrder: nextSeq
    });
  }

  removeMilestone(index: number): void {
    this.milestones.splice(index, 1);
    this.milestones.forEach((m, i) => m.sequenceOrder = i + 1);
  }

  get f() {
    return this.projectForm.controls;
  }
}
