import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { PharmacySupportApiService } from 'src/app/services/cashier/pharmacy-support-api.service';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';

import { RadioButtonModule } from 'primeng/radiobutton';
import { AuthService } from 'src/app/modules/auth';

export interface PatientProfile {
  id: string;
  patientCode: string;
  nationalId: string;
  fullName: string;
  dob: Date;
  age: number;
  gender: 'male' | 'female';
  isActive: boolean;
  phone: string;
  insuranceClass: string;
  activePrescriptions: number;
  allergies: string[];
  chronicDiseases: string[];
  notes?: string;
  lastVisit: Date;
}

@Component({
  selector: 'app-pharmacy-patients',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    TableModule,
    TagModule,
    ReactiveFormsModule,
    InputNumberModule,
    InputTextareaModule,
    TooltipModule,
    CalendarModule,
    ConfirmDialogModule,
    ToastModule,
    RadioButtonModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './pharmacy-patients.component.html',
  styleUrls: ['./pharmacy-patients.component.scss']
})
export class PharmacyPatientsComponent implements OnInit {
  patients = signal<PatientProfile[]>([]);
  selectedPatient = signal<PatientProfile | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  searchTerm = '';
  selectedInsurance = 'all';
  activeQuickFilter = signal<'all' | 'chronic' | 'allergies' | 'insured' | 'active'>('all');
  
  // Radio button filters matching sales-invoice-list pattern
  genderFilter: 'all' | 'male' | 'female' = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  insuranceFilter: 'all' | 'insured' | 'cash' = 'all';

  columns: any[] = [];
  
  showDetailsDialog = false;
  showAddDialog = false;
  showPrescriptionsDialog = false;
  showPrescriptionDetailsModal = false;
  isEditMode = false;
  patientForm: FormGroup;

  patientPrescriptions = signal<any[]>([]);
  isLoadingPrescriptions = signal<boolean>(false);
  selectedPatientForPrescriptions = signal<PatientProfile | null>(null);
  selectedPrescriptionDetails = signal<any | null>(null);

  genderOptions: any[] = [];
  statusOptions: any[] = [];

  filterGenderOptions = [
    { label: 'كل الأجناس', value: 'all' },
    { label: 'ذكور', value: 'male' },
    { label: 'إناث', value: 'female' }
  ];

  filterStatusOptions = [
    { label: 'كل الحالات', value: 'all' },
    { label: 'نشط', value: 'active' },
    { label: 'غير نشط', value: 'inactive' }
  ];

  filterInsuranceOptions = [
    { label: 'كل أنواع التأمين', value: 'all' },
    { label: 'مرضى التأمين', value: 'insured' },
    { label: 'نقدي (بدون تأمين)', value: 'cash' }
  ];

  constructor(
    private translateService: TranslateService,
    private fb: FormBuilder,
    private pharmacySupportApiService: PharmacySupportApiService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    public authService: AuthService
  ) {
    this.initForm();
    this.initColumns();
    this.genderOptions = [
      { label: this.translateService.instant('PHARMACY_PATIENTS.GENDER_MALE') || 'ذكر', value: 'male' },
      { label: this.translateService.instant('PHARMACY_PATIENTS.GENDER_FEMALE') || 'أنثى', value: 'female' }
    ];
    this.statusOptions = [
      { label: this.translateService.instant('PHARMACY_PATIENTS.STATUS_ACTIVE') || 'نشط', value: true },
      { label: this.translateService.instant('PHARMACY_PATIENTS.STATUS_INACTIVE') || 'غير نشط', value: false }
    ];
  }

  get canCreateEditPatient(): boolean {
    return this.authService.hasPermission('Pharmacy.Patients.CreateEdit') || this.authService.hasPermission('Pharmacy.Create') || this.authService.hasPermission('Pharmacy.Update');
  }

  get canDeletePatient(): boolean {
    return this.authService.hasPermission('Pharmacy.Patients.Delete') || this.authService.hasPermission('Pharmacy.Delete');
  }

  get canViewPrescriptions(): boolean {
    return this.authService.hasPermission('Pharmacy.Prescriptions.ViewHistory') || this.authService.hasPermission('Pharmacy.Read');
  }

  private initColumns(): void {
    this.columns = [
      { field: 'fullName', header: this.translateService.instant('PHARMACY_PATIENTS.TABLE_NAME') || 'الاسم', filter: true, filterType: 'text' },
      { field: 'nationalId', header: this.translateService.instant('PHARMACY_PATIENTS.FIELD_NATIONAL_ID') || 'رقم الهوية', filter: true, filterType: 'text' },
      { field: 'age', header: this.translateService.instant('PHARMACY_PATIENTS.TABLE_AGE') || 'العمر', filter: true, filterType: 'numeric' },
      { field: 'gender', header: this.translateService.instant('PHARMACY_PATIENTS.TABLE_GENDER') || 'الجنس', filter: true, filterType: 'text' },
      { field: 'phone', header: this.translateService.instant('PHARMACY_PATIENTS.TABLE_PHONE') || 'الجوال', filter: true, filterType: 'text' },
      { field: 'insuranceClass', header: this.translateService.instant('PHARMACY_PATIENTS.TABLE_INSURANCE') || 'فئة التأمين', filter: true, filterType: 'text' },
      { field: 'activePrescriptions', header: this.translateService.instant('PHARMACY_PATIENTS.TABLE_ACTIVE_RX') || 'وصفات نشطة', filter: true, filterType: 'numeric' },
      { field: 'isActive', header: this.translateService.instant('PHARMACY_PATIENTS.FIELD_STATUS') || 'الحالة', filter: true, filterType: 'boolean' }
    ];
  }

  clearFilters(table?: any): void {
    this.searchTerm = '';
    this.selectedInsurance = 'all';
    this.genderFilter = 'all';
    this.statusFilter = 'all';
    this.insuranceFilter = 'all';
    this.activeQuickFilter.set('all');
    if (table) {
      table.clear();
    }
  }

  confirmDeletePatient(patient: PatientProfile): void {
    this.confirmationService.confirm({
      header: 'تأكيد حذف ملف المريض',
      message: `هل أنت متأكد من رغبتك في حذف ملف المريض "${patient.fullName}" نهائياً؟`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم، حذف',
      rejectLabel: 'إلغاء',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-secondary p-button-sm',
      accept: () => {
        this.pharmacySupportApiService.deletePatient(patient.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'تم الحذف',
              detail: `تم حذف ملف المريض "${patient.fullName}" بنجاح.`
            });
            this.loadPatients();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء محاولة حذف ملف المريض.'
            });
          }
        });
      }
    });
  }

  private initForm(): void {
    this.patientForm = this.fb.group({
      fullName: ['', Validators.required],
      nationalId: ['', Validators.required],
      patientCode: [''],
      dob: [null, Validators.required],
      age: [null],
      gender: ['male', Validators.required],
      isActive: [true],
      phone: [''],
      insuranceProvider: [''],
      insuranceId: [''],
      insuranceClass: [''],
      allergies: [''],
      chronicDiseases: [''],
      notes: ['']
    });

    this.patientForm.get('dob')?.valueChanges.subscribe(val => {
      if (val) {
        const calculated = this.calculateAge(val);
        this.patientForm.get('age')?.patchValue(calculated, { emitEvent: false });
      }
    });
  }

  openAddPatient(): void {
    this.isEditMode = false;
    this.selectedPatient.set(null);
    this.patientForm.reset({ 
      gender: 'male',
      isActive: true
    });
    this.showAddDialog = true;
  }

  editPatient(patient: PatientProfile): void {
    this.isEditMode = true;
    this.selectedPatient.set(patient);
    
    this.patientForm.patchValue({
      ...patient,
      dob: patient.dob ? new Date(patient.dob) : null,
      allergies: Array.isArray(patient.allergies) ? patient.allergies.join('، ') : (patient.allergies || ''),
      chronicDiseases: Array.isArray(patient.chronicDiseases) ? patient.chronicDiseases.join('، ') : (patient.chronicDiseases || ''),
      insuranceProvider: (patient as any).insuranceProvider || patient.insuranceClass || '',
      insuranceId: (patient as any).insuranceId || ''
    });
    
    this.showAddDialog = true;
  }

  savePatient(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى استكمال الحقول المطلوبة'
      });
      return;
    }

    this.isSaving.set(true);
    const formValue = this.patientForm.value;
    const payload = {
      fullName: formValue.fullName,
      patientCode: formValue.patientCode || '',
      dob: formValue.dob ? new Date(formValue.dob).toISOString() : null,
      age: Number(formValue.age) || this.calculateAge(formValue.dob),
      gender: formValue.gender === 'female' ? 'Female' : 'Male',
      nationalId: formValue.nationalId,
      phone: formValue.phone || '',
      mobile: formValue.phone || '',
      email: '',
      hasInsurance: !!formValue.insuranceClass || !!formValue.insuranceProvider,
      insuranceClass: formValue.insuranceClass || formValue.insuranceProvider || '',
      allergies: formValue.allergies || '',
      chronicDiseases: formValue.chronicDiseases || '',
      notes: formValue.notes || '',
      isActive: formValue.isActive ?? true
    };

    const request$ = this.isEditMode && this.selectedPatient()?.id
      ? this.pharmacySupportApiService.updatePatient(this.selectedPatient()!.id, payload)
      : this.pharmacySupportApiService.createPatient(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showAddDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'تم بنجاح',
          detail: this.isEditMode ? 'تم تحديث بيانات المريض بنجاح' : 'تم إضافة المريض الجديد بنجاح'
        });
        this.loadPatients();
      },
      error: () => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل حفظ بيانات المريض. يرجى المحاولة مرة أخرى.'
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  setQuickFilter(filter: 'all' | 'chronic' | 'allergies' | 'insured' | 'active'): void {
    this.activeQuickFilter.set(filter);
  }

  get insuranceOptions(): Array<{ label: string; value: string }> {
    const rawClasses = this.patients()
      .map(p => (p.insuranceClass || '').trim())
      .filter(c => !!c && c.length > 0 && c !== '-');
    const uniqueClasses = Array.from(new Set(rawClasses));

    return [
      { label: 'كل فئات التأمين', value: 'all' },
      { label: 'نقدي (بدون تأمين)', value: 'cash_only' },
      ...uniqueClasses.filter(item => item !== 'نقدي').map(item => ({ label: `فئة: ${item}`, value: item }))
    ];
  }

  get filteredPatients(): PatientProfile[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    const quick = this.activeQuickFilter();
    const ins = this.selectedInsurance;
    const gender = this.genderFilter;
    const status = this.statusFilter;
    const insFilter = this.insuranceFilter;

    return this.patients().filter(patient => {
      // 1. Insurance Dropdown Filter
      let insuranceMatch = true;
      const patientIns = (patient.insuranceClass || '').trim().toLowerCase();

      if (ins === 'all') {
        insuranceMatch = true;
      } else if (ins === 'cash_only') {
        insuranceMatch = !patientIns || patientIns === 'نقدي' || patientIns === '-';
      } else {
        insuranceMatch = patientIns === ins.toLowerCase();
      }
      
      // 2. Radio: Gender Filter
      let genderMatch = true;
      if (gender !== 'all') {
        genderMatch = patient.gender === gender;
      }

      // 3. Radio: Status Filter
      let statusMatch = true;
      if (status === 'active') {
        statusMatch = patient.isActive === true;
      } else if (status === 'inactive') {
        statusMatch = patient.isActive === false;
      }

      // 4. Radio: Insurance Filter
      let insRadioMatch = true;
      if (insFilter === 'insured') {
        insRadioMatch = !!patientIns && patientIns !== 'نقدي' && patientIns !== '-';
      } else if (insFilter === 'cash') {
        insRadioMatch = !patientIns || patientIns === 'نقدي' || patientIns === '-';
      }

      // 5. Search Keyword Filter
      const textMatch = !keyword || 
        (patient.patientCode && patient.patientCode.toLowerCase().includes(keyword)) ||
        (patient.fullName && patient.fullName.toLowerCase().includes(keyword)) ||
        (patient.nationalId && patient.nationalId.toLowerCase().includes(keyword)) ||
        (patient.phone && patient.phone.toLowerCase().includes(keyword));

      // 6. Quick Filter Pill Filter
      let quickMatch = true;
      if (quick === 'chronic') {
        quickMatch = Array.isArray(patient.chronicDiseases) && patient.chronicDiseases.length > 0;
      } else if (quick === 'allergies') {
        quickMatch = Array.isArray(patient.allergies) && patient.allergies.length > 0;
      } else if (quick === 'insured') {
        quickMatch = !!patientIns && patientIns !== 'نقدي' && patientIns !== '-';
      } else if (quick === 'active') {
        quickMatch = patient.isActive === true;
      }

      return insuranceMatch && genderMatch && statusMatch && insRadioMatch && textMatch && quickMatch;
    });
  }

  get patientsCount(): number {
    return this.patients().length;
  }

  get chronicCasesCount(): number {
    return this.patients().filter(patient => Array.isArray(patient.chronicDiseases) && patient.chronicDiseases.length > 0).length;
  }

  get allergyCasesCount(): number {
    return this.patients().filter(patient => Array.isArray(patient.allergies) && patient.allergies.length > 0).length;
  }

  get insuredCount(): number {
    return this.patients().filter(patient => !!patient.insuranceClass && patient.insuranceClass.toLowerCase() !== 'نقدي' && patient.insuranceClass !== '-').length;
  }

  get activePatientsCount(): number {
    return this.patients().filter(patient => patient.isActive).length;
  }

  openPatient(patient: PatientProfile): void {
    this.selectedPatient.set(patient);
    this.showDetailsDialog = true;
    this.patientPrescriptions.set([]);

    // Load full details
    this.pharmacySupportApiService.getPatientById(patient.id).subscribe({
      next: (response) => {
        this.selectedPatient.set({
          ...patient,
          ...response
        } as PatientProfile);
      },
      error: () => {}
    });

    // Also load patient prescriptions for the details modal
    this.pharmacySupportApiService.getPatientPrescriptions(patient.id).subscribe({
      next: (prescriptions: any[]) => {
        this.patientPrescriptions.set(prescriptions || []);
      },
      error: () => {}
    });
  }

  viewPatientPrescriptions(patient: PatientProfile): void {
    this.selectedPatientForPrescriptions.set(patient);
    this.showPrescriptionsDialog = true;
    this.patientPrescriptions.set([]);
    this.isLoadingPrescriptions.set(true);

    this.pharmacySupportApiService.getPatientPrescriptions(patient.id).subscribe({
      next: (prescriptions) => {
        this.patientPrescriptions.set(prescriptions || []);
        this.isLoadingPrescriptions.set(false);
      },
      error: () => {
        this.patientPrescriptions.set([]);
        this.isLoadingPrescriptions.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل الوصفات الطبية للمريض.'
        });
      }
    });
  }

  viewPrescriptionDetails(rx: any): void {
    this.selectedPrescriptionDetails.set(rx);
    this.showPrescriptionDetailsModal = true;
  }

  getRxStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    if (!status) return 'secondary';
    const s = status.toLowerCase();
    if (s === 'delivered' || s === 'dispensed' || s === 'completed') return 'success';
    if (s === 'ready' || s === 'approved') return 'info';
    if (s === 'pending' || s === 'in_progress' || s === 'draft') return 'warning';
    if (s === 'cancelled' || s === 'rejected') return 'danger';
    return 'info';
  }

  getRxStatusLabel(status: string): string {
    if (!status) return 'غير محدد';
    const s = status.toLowerCase();
    const map: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'in_progress': 'قيد التحضير',
      'ready': 'جاهزة للصرف',
      'dispensed': 'تم الصرف',
      'delivered': 'تم التسليم والصرف',
      'completed': 'مكتملة',
      'cancelled': 'ملغاة',
      'draft': 'مسودة'
    };
    return map[s] || status;
  }

  loadPatients(): void {
    this.isLoading.set(true);
    this.pharmacySupportApiService.getPatients(1, 150).subscribe({
      next: (patients) => {
        this.patients.set(patients as unknown as PatientProfile[]);
        this.isLoading.set(false);
      },
      error: () => {
        this.patients.set([]);
        this.isLoading.set(false);
      }
    });
  }

  refreshList(): void {
    this.loadPatients();
    this.messageService.add({
      severity: 'info',
      summary: 'تحديث',
      detail: 'جاري تحديث بيانات المرضى...',
      life: 2000
    });
  }

  getInitials(name: string): string {
    if (!name) return 'م';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + ' ' + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.messageService.add({
        severity: 'info',
        summary: 'نسخ',
        detail: `تم نسخ ${label} إلى الحافظة`,
        life: 2500
      });
    });
  }

  calculateAge(dob: Date | string): number {
    if (!dob) return 0;
    const date = new Date(dob);
    if (isNaN(date.getTime())) return 0;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }
}
