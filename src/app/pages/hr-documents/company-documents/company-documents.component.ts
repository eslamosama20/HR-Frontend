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
import {InputSwitchModule} from 'primeng/inputswitch';
import {InputNumberModule} from 'primeng/inputnumber';
import {TooltipModule} from 'primeng/tooltip';
import {FileUpload, FileUploadModule} from 'primeng/fileupload';
import {InputTextareaModule} from 'primeng/inputtextarea';
import {AuthService} from '../../../modules/auth';
import {TranslationService} from '../../../modules/i18n';
import {PermissionModel} from '../../../models/auth/permission.model';
import {UserAccountModel} from '../../../models/auth/userAccount.model';
import primengArTranslations from '../../../utils/primengArTranslations';
import {CompanyDocumentService} from '../../../services/hr/company-document.service';
import {CompanyDocumentModel} from '../../../models/hr/company-document.model';
import {DocumentStatus, DocumentTemplateType} from '../../../enums/document-enums';
import {DocumentTemplateService} from '../../../services/settings/document-template.service';
import {DocumentTemplateModel} from '../../../models/settings/document-template.model';
import {AttachmentService} from '../../../services/attachments/attachment.service';

@Component({
  selector: 'app-company-documents',
  templateUrl: './company-documents.component.html',
  styleUrl: './company-documents.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, TableModule, ButtonModule, DialogModule, ToastModule, ConfirmDialogModule, DropdownModule, InputTextModule, CalendarModule, InputSwitchModule, InputNumberModule, TooltipModule, FileUploadModule, InputTextareaModule],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class CompanyDocumentsComponent implements OnInit {
  itemsSignal = signal<CompanyDocumentModel[]>([]);
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
    {field: 'documentName', header: 'DOCUMENT_NAME'},
    {field: 'documentType', header: 'DOCUMENT_TYPE'},
    {field: 'issueDate', header: 'ISSUE_DATE'},
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
  documentTypeOptions = [
    {label: 'تفويض', value: 'تفويض'},
    {label: 'سند قبض', value: 'سند قبض'},
    {label: 'عرض سعر', value: 'عرض سعر'},
    {label: 'سند أمانة', value: 'سند أمانة'},
    {label: 'سجل شيك', value: 'سجل شيك'},
    {label: 'اتفاقية', value: 'اتفاقية'},
    {label: 'مستند شركة', value: 'مستند شركة'},
    {label: 'عقد', value: 'عقد'},
    {label: 'ترخيص', value: 'ترخيص'},
    {label: 'شهادة', value: 'شهادة'},
    {label: 'أخرى', value: 'أخرى'}
  ];

  constructor(private primengConfig: PrimeNGConfig, private fb: FormBuilder, private authService: AuthService, private confirmationService: ConfirmationService, private messageService: MessageService, private translateService: TranslateService, public translationService: TranslationService, public itemService: CompanyDocumentService, private documentTemplateService: DocumentTemplateService, private attachmentService: AttachmentService) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission)).reduce((acc, val) => acc.concat(val), []);
    });
    this.formGroup = this.fb.group({
      id: [null], referenceNumber: [''], documentName: ['', Validators.required], documentType: [null, Validators.required],
      documentNumber: [''], issuingAuthority: [''], issueDate: [null, Validators.required], expirationDate: [null, Validators.required],
      preReminderDays: [30], isCritical: [false], description: [''], status: [DocumentStatus.Pending], attachmentId: [null]
    });
    if (this.activeLanguage === 'ar') this.primengConfig.setTranslation(primengArTranslations);
  }

  selectedFile: File | null = null;
  uploadedFileName: string | null = null;

  ngOnInit(): void { this.loadData(); this.loadTemplates(); }

  loadTemplates(): void {
    this.documentTemplateService.getAllByType(DocumentTemplateType.CompanyDocument).subscribe({
      next: (data) => { this.templates = data; },
      error: () => { this.templates = []; }
    });
  }

  loadData(): void {
    this.loading = true;
    this.itemService.getAll().subscribe({ next: (data) => { this.items = data; this.loading = false; }, error: () => { this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل البيانات'}); this.loading = false; }});
  }

  openNew(): void { this.formGroup.reset({preReminderDays: 30, isCritical: false, status: DocumentStatus.Pending, attachmentId: null}); this.selectedFile = null; this.uploadedFileName = null; this.dialogVisible = true; }

  edit(item: CompanyDocumentModel): void {
    this.formGroup.patchValue({...item, issueDate: item.issueDate ? new Date(item.issueDate) : null, expirationDate: item.expirationDate ? new Date(item.expirationDate) : null});
    this.selectedFile = null;
    this.uploadedFileName = item.attachmentId ? 'مرفق موجود' : null;
    this.dialogVisible = true;
  }

  private formatDate(d: any): string | null { if (!d) return null; return d instanceof Date ? d.toISOString().split('T')[0] : typeof d === 'string' && d.trim() ? d.split('T')[0] : null; }

  save(): void {
    if (this.formGroup.invalid) { this.messageService.add({severity: 'warn', summary: 'تنبيه', detail: 'يرجى ملء الحقول المطلوبة'}); return; }
    const v = this.formGroup.value;
    const doSave = (attachmentId?: string) => {
      const payload = new CompanyDocumentModel({...v, attachmentId: attachmentId ?? v.attachmentId, issueDate: this.formatDate(v.issueDate), expirationDate: this.formatDate(v.expirationDate)});
      const obs = v.id ? this.itemService.update(payload) : this.itemService.create(payload);
      obs.subscribe({ next: () => { this.messageService.add({severity: 'success', summary: 'تم بنجاح', detail: 'تم الحفظ بنجاح'}); this.dialogVisible = false; this.selectedFile = null; this.uploadedFileName = null; this.loadData(); }, error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في الحفظ'}) });
    };
    if (this.selectedFile) {
      this.attachmentService.uploadFile(this.selectedFile).subscribe({
        next: (att) => doSave(att.id),
        error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في رفع الملف'})
      });
    } else {
      doSave();
    }
  }

  onFileSelect(event: any): void {
    this.selectedFile = event.files?.[0] ?? null;
    this.uploadedFileName = this.selectedFile?.name ?? null;
  }

  removeFile(): void {
    this.selectedFile = null;
    this.uploadedFileName = null;
    this.formGroup.patchValue({attachmentId: null});
  }

  downloadAttachment(item: CompanyDocumentModel): void {
    if (!item.attachmentId) return;
    this.attachmentService.downloadFile(item.attachmentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => this.messageService.add({severity: 'error', summary: 'خطأ', detail: 'فشل في تحميل المرفق'})
    });
  }

  delete(item: CompanyDocumentModel): void {
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
