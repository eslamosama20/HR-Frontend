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
import {TooltipModule} from 'primeng/tooltip';
import {AuthService} from '../../../modules/auth';
import {TranslationService} from '../../../modules/i18n';
import {PermissionModel} from '../../../models/auth/permission.model';
import {UserAccountModel} from '../../../models/auth/userAccount.model';
import primengArTranslations from '../../../utils/primengArTranslations';
import {LeaveApplicationService} from '../../../services/hr/leave-application.service';
import {LeaveApplicationModel} from '../../../models/hr/leave-application.model';
import {EmployeeService} from '../../../services/hr/employee.service';
import {LeaveType, LeaveStatus, DocumentTemplateType} from '../../../enums/document-enums';
import {DocumentTemplateService} from '../../../services/settings/document-template.service';
import {DocumentTemplateModel} from '../../../models/settings/document-template.model';

@Component({
  selector: 'app-leave-applications',
  templateUrl: './leave-applications.component.html',
  styleUrl: './leave-applications.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, TableModule, ButtonModule, DialogModule, ToastModule, ConfirmDialogModule, DropdownModule, InputTextModule, InputNumberModule, CalendarModule, TooltipModule],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class LeaveApplicationsComponent implements OnInit {
  itemsSignal = signal<LeaveApplicationModel[]>([]);
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
    {field: 'leaveType', header: 'LEAVE_TYPE'},
    {field: 'startDate', header: 'START_DATE'},
    {field: 'endDate', header: 'END_DATE'},
    {field: 'status', header: 'STATUS'}
  ];
  leaveTypeOptions = [
    {label: 'سنوية', value: LeaveType.Annual},
    {label: 'مرضية', value: LeaveType.Sick},
    {label: 'طارئة', value: LeaveType.Emergency},
    {label: 'بدون راتب', value: LeaveType.Unpaid},
    {label: 'أمومة', value: LeaveType.Maternity},
    {label: 'أبوة', value: LeaveType.Paternity},
    {label: 'أخرى', value: LeaveType.Other}
  ];
  statusOptions = [
    {label: 'معلق', value: LeaveStatus.Pending},
    {label: 'موافق عليه', value: LeaveStatus.Approved},
    {label: 'مرفوض', value: LeaveStatus.Rejected},
    {label: 'ملغي', value: LeaveStatus.Cancelled}
  ];

  constructor(private primengConfig: PrimeNGConfig, private fb: FormBuilder, private authService: AuthService, private confirmationService: ConfirmationService, private messageService: MessageService, private translateService: TranslateService, public translationService: TranslationService, public itemService: LeaveApplicationService, public employeeService: EmployeeService, private documentTemplateService: DocumentTemplateService) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission)).reduce((acc, val) => acc.concat(val), []);
    });
    this.formGroup = this.fb.group({
      id: [null], referenceNumber: [''], employeeId: [null, Validators.required], leaveType: [LeaveType.Annual, Validators.required],
      startDate: [null, Validators.required], endDate: [null, Validators.required], totalDays: [null],
      reason: [''], notes: [''], status: [LeaveStatus.Pending]
    });
    if (this.activeLanguage === 'ar') this.primengConfig.setTranslation(primengArTranslations);
  }

  ngOnInit(): void { this.loadData(); this.loadTemplates(); }

  loadTemplates(): void {
    this.documentTemplateService.getAllByType(DocumentTemplateType.LeaveApplication).subscribe({
      next: (data) => { this.templates = data; },
      error: () => { this.templates = []; }
    });
  }

  loadData(): void {
    this.loading = true;
    this.itemService.getAll().subscribe({ next: (data) => { this.items = data; this.loading = false; }, error: () => { this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل البيانات'}); this.loading = false; }});
    this.employeeService.getAll().subscribe({ next: (data) => this.employeesSignal.set(data.map((e: any) => ({label: e.name, value: e.id}))) });
  }

  openNew(): void { this.formGroup.reset({leaveType: LeaveType.Annual, status: LeaveStatus.Pending}); this.dialogVisible = true; }

  edit(item: LeaveApplicationModel): void {
    this.formGroup.patchValue({...item, startDate: item.startDate ? new Date(item.startDate) : null, endDate: item.endDate ? new Date(item.endDate) : null});
    this.dialogVisible = true;
  }

  private formatDate(d: any): string | null { if (!d) return null; return d instanceof Date ? d.toISOString().split('T')[0] : typeof d === 'string' && d.trim() ? d.split('T')[0] : null; }

  save(): void {
    if (this.formGroup.invalid) { this.messageService.add({severity: 'warn', summary: 'تنبيه', detail: 'يرجى ملء الحقول المطلوبة'}); return; }
    const v = this.formGroup.value;
    const payload = new LeaveApplicationModel({...v, startDate: this.formatDate(v.startDate), endDate: this.formatDate(v.endDate)});
    const obs = v.id ? this.itemService.update(payload) : this.itemService.create(payload);
    obs.subscribe({ next: () => { this.messageService.add({severity: 'success', summary: 'تم بنجاح', detail: 'تم الحفظ بنجاح'}); this.dialogVisible = false; this.loadData(); }, error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في الحفظ'}) });
  }

  delete(item: LeaveApplicationModel): void {
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
