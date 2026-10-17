import {Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {PermissionModel} from "../../../models/auth/permission.model";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {AuthService} from "../../../modules/auth";
import {TranslationService} from "../../../modules/i18n";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import primengArTranslations from "../../../utils/primengArTranslations";
import {Table, TableModule} from "primeng/table";
import * as FileSaver from 'file-saver';
import { formatDateOnly} from "../../../utils/formatDateOnly";
import {EmployeeModel} from "../../../models/hr/employee.model";
import {EmployeeService} from "../../../services/hr/employee.service";
import {forkJoin} from "rxjs";
import {AttachmentService} from "../../../services/attachments/attachment.service";
import {AttachmentModel} from "../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {FileUpload} from "primeng/fileupload";

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-hr-attachment',
  templateUrl: './hr-attachment.component.html',
  styleUrl: './hr-attachment.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class HrAttachmentComponent implements OnInit{
  @ViewChild('fileUploader') fileUploader!: FileUpload;

  attachmentDialogVisibleSignal = signal(false);
  get attachmentDialogVisible() {
    return this.attachmentDialogVisibleSignal();
  }
  set attachmentDialogVisible(value) {
    this.attachmentDialogVisibleSignal.set(value);
  }


  attachmentsSignal = signal<any[]>([]);
  get attachments() {
    return this.attachmentsSignal();
  }
  set attachments(value) {
    this.attachmentsSignal.set(value);
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }


  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  constructor(
    private sanitizer: DomSanitizer,
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public attachmentsService: AttachmentService,
    public employeeService: EmployeeService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );



    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'referenceNumber', header:"الرقم", filter: true , filterType: 'text'},
      {field: 'fileName', header:"اسم الملف", filter: true , filterType: 'text'},
      {field: 'fileType', header:"نوع الملف", filter: true , filterType: 'text'},
      {field: 'uploadedAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'}
    ];
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    forkJoin({
      attachments: this.attachmentsService.getAllNoneReferenced()
    }).subscribe({
      next: ({   attachments }) => {
        this.attachments = attachments.map(x => ({
          ...x,
          uploadedAt: new Date(x.uploadedAt),
        }))
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Attachments', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.METALS_LOADING_ERROR')
        })
      }
    })
  }

  showAddAttachmentDialog(){
    this.attachmentDialogVisible = true;
    this.fileUploader.clear();
  }



  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains')
  }


  deleteAttachment(attachments: AttachmentModel) {
    this.attachmentsService.delete(attachments.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الحذف بنجاح" });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Attachment', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmAttachmentDeletion(event: Event , attachments: any) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف المرفق ؟`,
        header: "حذف المرفق",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteAttachment(attachments);
        },
    });
  }
  closeAttachmentDialog() {
    this.attachmentDialogVisible = false;
    this.fileUploader.clear();
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.attachments.map(y => {
        const row = {};
        this.columns.forEach(x => {
          if (x.filterType === 'date') {
            // @ts-ignore
            row[x.detail] = new Date(y[x.field]).toLocaleString(
              'ar-EG-u-ca-gregory',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
          } else {
            // @ts-ignore
            row[x.detail] = y[x.field];
          }
        });
        return row;
      });
      console.log(data);
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'Attachmentes');
    });
  }
  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION);
  }

  isFileUploading: boolean = false;
  currentPdfUrlSignal = signal<SafeResourceUrl>(null);
  get currentPdfUrl() {
    return this.currentPdfUrlSignal();
  }
  set currentPdfUrl(value) {
    this.currentPdfUrlSignal.set(value);
  }

  onFileSelected(event: any) {
    this.isFileUploading = true;
    const files = event.files;
    if (!files || files.length === 0) {
      this.isFileUploading = false;
      return;
    }
    Array.from(files).forEach((file: File) => {
      console.log(file.type)
      if (file.type !== 'application/pdf' && file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/jpg') {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'نوع الملف غير مدعوم',
        });
        return;
      }
      this.attachmentsService.uploadFile(file).subscribe({
        next:(res)=>{
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'تم الرقع بنجاح',
          });
          this.loadData();
        },
        error:(err)=>{
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'حدث خظأ في رقع الملف',
          });
        }
      })
      this.fileUploader.clear();
      this.isFileUploading = false;
      this.closeAttachmentDialog();
    });
  }

  onView(pdf: AttachmentModel) {
    if (pdf.fileData || pdf.file)
    {
      const byteCharacters = atob(pdf.fileData ?? pdf.file); // Decode Base64 to binary string
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i); // Get char codes
      }
      const byteArray = new Uint8Array(byteNumbers); // Convert to Uint8Array

      // Create a Blob from the byte array
      const blob = new Blob([byteArray], { type: pdf.fileType });
      const blobUrl = URL.createObjectURL(blob); // Create object URL
      this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl); // Sanitize URL
      window.open(blobUrl, '_blank');

    }
    else{
      this.attachmentsService.downloadFile(pdf.id).subscribe(blob => {
        const blobUrl = URL.createObjectURL(blob);
        this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
        window.open(blobUrl, '_blank');
      });
    }
  }


}
