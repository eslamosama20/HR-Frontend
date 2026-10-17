import {Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {Table} from "primeng/table";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {AuthService} from "../../../modules/auth";
import { FormBuilder, FormGroup} from "@angular/forms";
import {PermissionModel} from "../../../models/auth/permission.model";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import {InventoryPermitModel} from "../../../models/permits/inventory-permit.model";
import {MainAccountService} from "../../../services/accounting/main-account.service";
import {Router} from "@angular/router";
import {InventoryPermitService} from "../../../services/permits/inventory-permit.service";
import {OverlayPanel} from "primeng/overlaypanel";
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http';
import { PdfUtilsService } from '../../../services/pdf-utils.service';
import { environment } from 'src/environments/environment';
import { PERMISSIONS } from '../../../config/permissions';
import { formatDisplayDate } from '../../../utils/dateUtils';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-inventory-permits',
  templateUrl: './inventory-permits.component.html',
  styleUrl: './inventory-permits.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class InventoryPermitsComponent implements OnInit{
  readonly PERMISSIONS = PERMISSIONS;
  inventoryPermitsSignal = signal([]);
  inventoryPermitEntriesSignal = signal([]);

  loading: boolean = true;
  loadingPdf: boolean = false;
  sharingReport: boolean = false;
  showShareDialog: boolean = false;
  shareEmail: string = '';
  sharePhone: string = '';
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);
  inventoryPermitEntryFormGroup : FormGroup;

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  private router: Router;

  constructor(
    private inventoryPermitService : InventoryPermitService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    private http: HttpClient,
    private pdfUtils: PdfUtilsService,
    router: Router
  ) {
    this.router = router;
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
  }

  ngOnInit(): void {
    this.loadInventoryPermits()

    this.columns = [
      {field: 'referenceNumber', header: this.translate.instant('FINANCE.PERMIT_REFERENCE_NUMBER') , filter: true , filterType: 'text'},
      {field: 'permitType', header: this.translate.instant('FINANCE.INVENTORY_PERMIT_TYPE')},
      {field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION') , filter: true , filterType: 'text'},
      {field: 'permitDate', header: this.translate.instant('FINANCE.PERMIT_DATE'), filter: true , filterType: 'date'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'},
    ];
  }


  loadInventoryPermits() {
    this.loading = true;
    this.inventoryPermitService.getAll().subscribe({
      next: inventoryPermits => {
        this.inventoryPermits = inventoryPermits.map(x => {
          x.createdAt = new Date(x.createdAt);
          x.permitDate = new Date(x.permitDate);
          return x;
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading InventoryPermits', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR') });
        this.loading = false;
      }
    });
  }


  get inventoryPermits() {
    return this.inventoryPermitsSignal();
  }
  set inventoryPermits(value) {
    this.inventoryPermitsSignal.set(value);
  }
  get inventoryPermitEntries() {
    return this.inventoryPermitEntriesSignal();
  }
  set inventoryPermitEntries(value) {
    this.inventoryPermitEntriesSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
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


  deleteInventoryPermit(inventoryPermit: InventoryPermitModel) {
    this.loading = true;
    this.inventoryPermitService.delete(inventoryPermit.id).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.INVENTORY_PERMIT_DELETED') });
        this.loadInventoryPermits();
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  confirmInventoryPermitDeletion(event: Event , inventoryPermit: InventoryPermitModel) {
    this.opInventoryPermit?.hide();
    this.confirmationService.confirm({
        message: this.translate.instant('FINANCE.CONFIRM_INVENTORY_PERMIT_DELETE', {referenceNumber: inventoryPermit.referenceNumber}),
        header: this.translate.instant('FINANCE.INVENTORY_PERMIT_DELETE_CONFIRMATION'),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteInventoryPermit(inventoryPermit);
        },
    });
  }

  navigateToAddEntryInventoryPermit() {
    this.router.navigate(['/permits/inventory-permits/new/entry']);
  }
  navigateToAddExitInventoryPermit() {
    this.router.navigate(['/permits/inventory-permits/new/exit']);
  }

  navigateToInventoryPermit(inventoryPermit: InventoryPermitModel) {
    this.opInventoryPermit?.hide();
    this.router.navigate(['/permits/inventory-permits/', inventoryPermit.id]);
  }
  @ViewChild('opInventoryPermit') opInventoryPermit!: OverlayPanel;

  selectedInventoryPermit: any;

  openOverlayInventoryPermit(event: MouseEvent, entry: any) {
    event.preventDefault();
    
    this.selectedInventoryPermit = entry;
    this.opInventoryPermit.toggle(event);

    // نخلي البانال يظهر عند المؤشر بالظبط
    setTimeout(() => {
      const panelEl = this.opInventoryPermit.container as HTMLElement;
      if (panelEl) {
        panelEl.style.position = 'fixed';
        panelEl.style.left = `${event.clientX}px`;
        panelEl.style.top = `${event.clientY}px`;
      }
    });
  }

  // Export to Excel
  exportToExcel(): void {
    const data = this.inventoryPermits.map((item: InventoryPermitModel, index: number) => ({
      '#': index + 1,
      'رقم المرجع': item.referenceNumber,
      'النوع': item.permitType === 'Entry' ? 'إذن دخول' : 'إذن خروج',
      'الوصف': item.description || '-',
      'تاريخ الإذن': item.permitDate ? formatDisplayDate(item.permitDate) : '-',
      'تاريخ الإنشاء': item.createdAt ? formatDisplayDate(item.createdAt) : '-'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأذون المخزنية');
    XLSX.writeFile(wb, 'inventory-permits.xlsx');
    
    this.messageService.add({
      severity: 'success',
      summary: 'تم التصدير',
      detail: 'تم تصدير البيانات إلى Excel بنجاح'
    });
  }

  // Download PDF
  downloadPDF(): void {
    this.loadingPdf = true;
    const base = environment.server_urls[environment.active_server];
    const url = `${base.baseApi}inventoryPermit/Report/permits-document`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.pdfUtils.downloadFile(blob, `inventory-permits-report-${new Date().toISOString().split('T')[0]}.pdf`);
        this.loadingPdf = false;
        this.messageService.add({
          severity: 'success',
          summary: 'تم التنزيل',
          detail: 'تم تنزيل التقرير بنجاح'
        });
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.loadingPdf = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في تنزيل التقرير'
        });
      }
    });
  }

  // Print Report
  printReport(): void {
    this.loadingPdf = true;
    const base = environment.server_urls[environment.active_server];
    const url = `${base.baseApi}inventoryPermit/Report/permits-document`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.pdfUtils.printBlob(blob);
        this.loadingPdf = false;
      },
      error: (error) => {
        console.error('Error printing:', error);
        this.loadingPdf = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في طباعة التقرير'
        });
      }
    });
  }

  // Open Share Dialog
  openShareDialog(): void {
    this.shareEmail = '';
    this.sharePhone = '';
    this.showShareDialog = true;
  }

  // Share Report
  shareReport(): void {
    if (!this.canShare()) return;
    
    this.sharingReport = true;
    const method = this.shareEmail ? 'email' : 'whatsapp';
    const receiver = this.shareEmail || this.sharePhone;
    
    this.inventoryPermitService.shareReport(method, receiver).subscribe({
      next: () => {
        this.sharingReport = false;
        this.showShareDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'تم المشاركة',
          detail: 'تم مشاركة التقرير بنجاح'
        });
      },
      error: (error) => {
        console.error('Error sharing:', error);
        this.sharingReport = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في مشاركة التقرير'
        });
      }
    });
  }

  canShare(): boolean {
    return !!(this.shareEmail || this.sharePhone);
  }
}
