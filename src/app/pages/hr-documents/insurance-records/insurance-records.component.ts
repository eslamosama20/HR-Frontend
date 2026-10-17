import {Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {ConfirmationService, MessageService, PrimeNGConfig} from 'primeng/api';
import {Table, TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {ToastModule} from 'primeng/toast';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {DropdownModule} from 'primeng/dropdown';
import {InputTextModule} from 'primeng/inputtext';
import {InputNumberModule} from 'primeng/inputnumber';
import {CalendarModule} from 'primeng/calendar';
import {InputSwitchModule} from 'primeng/inputswitch';
import {TooltipModule} from 'primeng/tooltip';
import {AuthService} from '../../../modules/auth';
import {TranslationService} from '../../../modules/i18n';
import {PermissionModel} from '../../../models/auth/permission.model';
import {UserAccountModel} from '../../../models/auth/userAccount.model';
import primengArTranslations from '../../../utils/primengArTranslations';
import {InsuranceRecordService} from '../../../services/hr/insurance-record.service';
import {InsuranceRecordModel} from '../../../models/hr/insurance-record.model';
import {EmployeeService} from '../../../services/hr/employee.service';
import {DocumentStatus, InsuranceType, DocumentTemplateType} from '../../../enums/document-enums';
import {DocumentTemplateService} from '../../../services/settings/document-template.service';
import {DocumentTemplateModel} from '../../../models/settings/document-template.model';

@Component({
  selector: 'app-insurance-records',
  templateUrl: './insurance-records.component.html',
  styleUrl: './insurance-records.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, TableModule, ButtonModule, DialogModule, ToastModule, ConfirmDialogModule, DropdownModule, InputTextModule, InputNumberModule, CalendarModule, InputSwitchModule, TooltipModule],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class InsuranceRecordsComponent implements OnInit {
  itemsSignal = signal<InsuranceRecordModel[]>([]);
  get items() { return this.itemsSignal(); }
  set items(value) { this.itemsSignal.set(value); }

  employeesSignal = signal<any[]>([]);
  get employees() { return this.employeesSignal(); }

  templatesSignal = signal<DocumentTemplateModel[]>([]);
  get templates() { return this.templatesSignal(); }
  set templates(value) { this.templatesSignal.set(value); }

  loading = true;
  searchValue = '';
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] { return this.userPermissionsSignal(); }
  set userPermissions(p: PermissionModel[]) { this.userPermissionsSignal.set(p); }

  dialogVisible = false;
  formGroup: FormGroup;
  activeLanguage = 'en';
  translate: TranslateService;
  columns = [
    {field: 'referenceNumber', header: 'REFERENCE_NUMBER'},
    {field: 'employeeName', header: 'EMPLOYEE'},
    {field: 'insuranceType', header: 'INSURANCE_TYPE'},
    {field: 'policyNumber', header: 'POLICY_NUMBER'},
    {field: 'expirationDate', header: 'EXPIRATION_DATE'},
    {field: 'status', header: 'STATUS'}
  ];
  statusOptions = [
    {label: 'مسودة', value: DocumentStatus.Draft},
    {label: 'معلق', value: DocumentStatus.Pending},
    {label: 'موافق عليه', value: DocumentStatus.Approved},
    {label: 'مرفوض', value: DocumentStatus.Rejected},
    {label: 'منتهي', value: DocumentStatus.Expired},
    {label: 'ملغي', value: DocumentStatus.Cancelled}
  ];
  insuranceTypeOptions = [
    {label: 'اجتماعي', value: InsuranceType.Social},
    {label: 'صحي', value: InsuranceType.Health},
    {label: 'حياة', value: InsuranceType.Life},
    {label: 'حوادث', value: InsuranceType.Accident}
  ];

  constructor(private primengConfig: PrimeNGConfig, private fb: FormBuilder, private authService: AuthService, private confirmationService: ConfirmationService, private messageService: MessageService, private translateService: TranslateService, public translationService: TranslationService, public itemService: InsuranceRecordService, public employeeService: EmployeeService, private documentTemplateService: DocumentTemplateService) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission)).reduce((acc, val) => acc.concat(val), []);
    });
    this.formGroup = this.fb.group({
      id: [null], employeeId: [null, Validators.required], insuranceNumber: ['', Validators.required], insuranceType: [InsuranceType.Health, Validators.required],
      providerName: [''], coverageAmount: [null],
      premium: [null], startDate: [null, Validators.required], expirationDate: [null, Validators.required],
      preReminderDays: [30], isCritical: [true], notes: ['']
    });
    if (this.activeLanguage === 'ar') this.primengConfig.setTranslation(primengArTranslations);
  }

  ngOnInit(): void { this.loadData(); this.loadTemplates(); }

  loadTemplates(): void {
    this.documentTemplateService.getAllByType(DocumentTemplateType.InsuranceRecord).subscribe({
      next: (data) => { this.templates = data; },
      error: () => { this.templates = []; }
    });
  }

  loadData(): void {
    this.loading = true;
    this.itemService.getAll().subscribe({ next: (data) => { this.items = data; this.loading = false; }, error: () => { this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل البيانات'}); this.loading = false; }});
    this.employeeService.getAll().subscribe({ next: (data) => this.employeesSignal.set(data.map((e: any) => ({label: e.name, value: e.id}))) });
  }

  openNew(): void { this.formGroup.reset({insuranceType: InsuranceType.Health, preReminderDays: 30, isCritical: true}); this.dialogVisible = true; }

  edit(item: InsuranceRecordModel): void {
    this.formGroup.patchValue({...item, startDate: item.startDate ? new Date(item.startDate) : null, expirationDate: item.expirationDate ? new Date(item.expirationDate) : null});
    this.dialogVisible = true;
  }

  private formatDate(d: any): string | null { if (!d) return null; return d instanceof Date ? d.toISOString().split('T')[0] : typeof d === 'string' && d.trim() ? d.split('T')[0] : null; }

  save(): void {
    if (this.formGroup.invalid) { this.messageService.add({severity: 'warn', summary: 'تنبيه', detail: 'يرجى ملء الحقول المطلوبة'}); return; }
    const v = this.formGroup.value;
    const payload = new InsuranceRecordModel({...v, startDate: this.formatDate(v.startDate), expirationDate: this.formatDate(v.expirationDate)});
    const obs = v.id ? this.itemService.update(payload) : this.itemService.create(payload);
    obs.subscribe({ next: () => { this.messageService.add({severity: 'success', summary: 'تم بنجاح', detail: 'تم الحفظ بنجاح'}); this.dialogVisible = false; this.loadData(); }, error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في الحفظ'}) });
  }

  delete(item: InsuranceRecordModel): void {
    this.confirmationService.confirm({ message: 'هل أنت متأكد؟', accept: () => {
      this.itemService.delete(item.id!).subscribe({ next: () => { this.messageService.add({severity: 'success', summary: 'تم بنجاح', detail: 'تم الحذف بنجاح'}); this.loadData(); }, error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في الحذف'}) });
    }});
  }

  onGlobalFilter(table: Table, event: Event): void { table.filterGlobal((event.target as HTMLInputElement).value, 'contains'); }

  downloadTemplate(template: DocumentTemplateModel): void {
    if (!template.id) return;
    this.documentTemplateService.getFileBlob(template.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل النموذج'})
    });
  }
}
