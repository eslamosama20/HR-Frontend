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
import {CalendarModule} from 'primeng/calendar';
import {TooltipModule} from 'primeng/tooltip';
import {AuthService} from '../../../modules/auth';
import {TranslationService} from '../../../modules/i18n';
import {PermissionModel} from '../../../models/auth/permission.model';
import {UserAccountModel} from '../../../models/auth/userAccount.model';
import primengArTranslations from '../../../utils/primengArTranslations';
import {EmploymentApplicationService} from '../../../services/hr/employment-application.service';
import {EmploymentApplicationModel} from '../../../models/hr/employment-application.model';
import {EmploymentApplicationStatus, DocumentTemplateType} from '../../../enums/document-enums';
import {DocumentTemplateService} from '../../../services/settings/document-template.service';
import {DocumentTemplateModel} from '../../../models/settings/document-template.model';

@Component({
  selector: 'app-employment-applications',
  templateUrl: './employment-applications.component.html',
  styleUrl: './employment-applications.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, TableModule, ButtonModule, DialogModule, ToastModule, ConfirmDialogModule, DropdownModule, InputTextModule, CalendarModule, TooltipModule],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class EmploymentApplicationsComponent implements OnInit {
  itemsSignal = signal<EmploymentApplicationModel[]>([]);
  get items() { return this.itemsSignal(); }
  set items(value) { this.itemsSignal.set(value); }

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
    {field: 'applicantName', header: 'APPLICANT_NAME'},
    {field: 'position', header: 'POSITION'},
    {field: 'applicationDate', header: 'APPLICATION_DATE'},
    {field: 'status', header: 'STATUS'}
  ];
  statusOptions = [
    {label: 'مقدم', value: EmploymentApplicationStatus.Received},
    {label: 'قيد المراجعة', value: EmploymentApplicationStatus.UnderReview},
    {label: 'تمت المقابلة', value: EmploymentApplicationStatus.InterviewScheduled},
    {label: 'تم التوظيف', value: EmploymentApplicationStatus.Hired},
    {label: 'مرفوض', value: EmploymentApplicationStatus.Rejected},
    {label: 'منسحب', value: EmploymentApplicationStatus.Withdrawn}
  ];

  constructor(private primengConfig: PrimeNGConfig, private fb: FormBuilder, private authService: AuthService, private confirmationService: ConfirmationService, private messageService: MessageService, private translateService: TranslateService, public translationService: TranslationService, public itemService: EmploymentApplicationService, private documentTemplateService: DocumentTemplateService) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission)).reduce((acc, val) => acc.concat(val), []);
    });
    this.formGroup = this.fb.group({
      id: [null], referenceNumber: [''], applicantName: ['', Validators.required], applicantIdNumber: [''],
      applicantPhone: [''], applicantEmail: [''], position: ['', Validators.required], department: [''], applicationDate: [null, Validators.required],
      expectedSalary: [null], experience: [''], education: [''], notes: [''], status: [EmploymentApplicationStatus.Received],
      expirationDate: [null], preReminderDays: [14], isCritical: [false]
    });
    if (this.activeLanguage === 'ar') this.primengConfig.setTranslation(primengArTranslations);
  }

  ngOnInit(): void { this.loadData(); this.loadTemplates(); }

  loadTemplates(): void {
    this.documentTemplateService.getAllByType(DocumentTemplateType.EmploymentApplication).subscribe({
      next: (data) => { this.templates = data; },
      error: () => { this.templates = []; }
    });
  }

  loadData(): void {
    this.loading = true;
    this.itemService.getAll().subscribe({ next: (data) => { this.items = data; this.loading = false; }, error: () => { this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل البيانات'}); this.loading = false; }});
  }

  openNew(): void { this.formGroup.reset({status: EmploymentApplicationStatus.Received, preReminderDays: 14, isCritical: false}); this.dialogVisible = true; }

  edit(item: EmploymentApplicationModel): void {
    this.formGroup.patchValue({...item, applicationDate: item.applicationDate ? new Date(item.applicationDate) : null, expirationDate: item.expirationDate ? new Date(item.expirationDate) : null});
    this.dialogVisible = true;
  }

  private formatDate(d: any): string | null { if (!d) return null; return d instanceof Date ? d.toISOString().split('T')[0] : typeof d === 'string' && d.trim() ? d.split('T')[0] : null; }

  save(): void {
    if (this.formGroup.invalid) { this.messageService.add({severity: 'warn', summary: 'تنبيه', detail: 'يرجى ملء الحقول المطلوبة'}); return; }
    const v = this.formGroup.value;
    const payload = new EmploymentApplicationModel({...v, applicationDate: this.formatDate(v.applicationDate), expirationDate: this.formatDate(v.expirationDate)});
    const obs = v.id ? this.itemService.update(payload) : this.itemService.create(payload);
    obs.subscribe({ next: () => { this.messageService.add({severity: 'success', summary: 'تم بنجاح', detail: 'تم الحفظ بنجاح'}); this.dialogVisible = false; this.loadData(); }, error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في الحفظ'}) });
  }

  delete(item: EmploymentApplicationModel): void {
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
