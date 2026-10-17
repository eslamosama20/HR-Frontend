import {Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {Table} from "primeng/table";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../modules/i18n";
import {AuthService} from "../../modules/auth";
import { FormBuilder, FormGroup} from "@angular/forms";
import {PermissionModel} from "../../models/auth/permission.model";
import {UserAccountModel} from "../../models/auth/userAccount.model";
import {InventoryStocktakingModel} from "../../models/inventory-stocktaking/inventoryStocktaking.model";
import {MainAccountService} from "../../services/accounting/main-account.service";
import {Router} from "@angular/router";
import {InventoryStocktakingService} from "../../services/inventory-stocktaking/inventory-stocktaking.service";
import {OverlayPanel} from "primeng/overlaypanel";
import * as XLSX from 'xlsx';
import { PERMISSIONS } from '../../config/permissions';
import { formatDisplayDate } from '../../utils/dateUtils';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-inventory-stocktaking-list',
  templateUrl: './inventory-stocktaking-list.component.html',
  styleUrl: './inventory-stocktaking-list.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class InventoryStocktakingListComponent implements OnInit{
  readonly PERMISSIONS = PERMISSIONS;
  inventoryStocktakingsSignal = signal([]);
  inventoryStocktakingEntriesSignal = signal([]);

  loading: boolean = true;
  loadingPdf: boolean = false;
  loadingShare: boolean = false;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);

  // Share dialog
  showShareDialog: boolean = false;
  selectedShareMethod: string = '';
  shareEmail: string = '';
  sharePhone: string = '';
  shareMethodOptions = [
    { label: 'البريد الإلكتروني', value: 'email' },
    { label: 'واتساب', value: 'whatsapp' }
  ];

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  private router: Router;

  constructor(
    private inventoryStocktakingService : InventoryStocktakingService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
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
    this.loadInventoryStocktakings()

    this.columns = [
      {field: 'referenceNumber', header: this.translate.instant('FINANCE.STOCKTAKING_REFERENCE_NUMBER') , filter: true , filterType: 'text'},
      {field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION') , filter: true , filterType: 'text'},
      {field: 'stocktakingDate', header: this.translate.instant('FINANCE.STOCKTAKING_DATE'), filter: true , filterType: 'date'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'},
    ];
  }


  loadInventoryStocktakings() {
    this.loading = true;
    this.inventoryStocktakingService.getAll().subscribe({
      next: inventoryStocktakings => {
        this.inventoryStocktakings = inventoryStocktakings.map(x => {
          x.createdAt = new Date(x.createdAt);
          x.stocktakingDate = new Date(x.stocktakingDate);
          return x;
        })
        console.log('InventoryStocktakings', this.inventoryStocktakings);
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading InventoryStocktakings', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR') });
        this.loading = false;
      }
    });
  }


  get inventoryStocktakings() {
    return this.inventoryStocktakingsSignal();
  }
  set inventoryStocktakings(value) {
    this.inventoryStocktakingsSignal.set(value);
  }
  get inventoryStocktakingEntries() {
    return this.inventoryStocktakingEntriesSignal();
  }
  set inventoryStocktakingEntries(value) {
    this.inventoryStocktakingEntriesSignal.set(value);
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


  deleteInventoryStocktaking(inventoryStocktaking: InventoryStocktakingModel) {
    this.loading = true;
    this.inventoryStocktakingService.delete(inventoryStocktaking.id).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.INVENTORY_STOCKTAKING_DELETED') });
      this.loadInventoryStocktakings();
    });
  }



  confirmInventoryStocktakingDeletion(event: Event , inventoryStocktaking: InventoryStocktakingModel) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: this.translate.instant('FINANCE.CONFIRM_INVENTORY_STOCKTAKING_DELETE', {referenceNumber: inventoryStocktaking.referenceNumber}),
        header: this.translate.instant('FINANCE.INVENTORY_STOCKTAKING_DELETE_CONFIRMATION'),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteInventoryStocktaking(inventoryStocktaking);
        },
    });
  }

  navigateToAddInventoryStocktaking() {
    this.router.navigate(['/inventory-stocktaking/new']);
  }

  navigateToInventoryStocktaking(inventoryStocktaking: InventoryStocktakingModel) {
    this.opInventoryStocktaking?.hide();
    this.router.navigate(['/inventory-stocktaking/', inventoryStocktaking.id]);
  }
  @ViewChild('opInventoryStocktaking') opInventoryStocktaking!: OverlayPanel;

selectedInventoryStocktaking: any;

openOverlayInventoryStocktaking(event: MouseEvent, entry: any) {
  event.preventDefault(); // منع القائمة السياقية الافتراضية
  this.selectedInventoryStocktaking = entry;
  this.opInventoryStocktaking.toggle(event);

  // نخلي البانال يظهر عند الماوس
  setTimeout(() => {
    const panelEl = this.opInventoryStocktaking.container as HTMLElement;
    if (panelEl) {
      panelEl.style.position = 'fixed';
      panelEl.style.left = `${event.clientX}px`;
      panelEl.style.top = `${event.clientY}px`;
    }
  });
}

// ==================== Report Tools ====================

downloadPDF() {
  this.loadingPdf = true;
  this.inventoryStocktakingService.getReport().subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير_جرد_المخزن_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.loadingPdf = false;
      this.messageService.add({ severity: 'success', summary: 'نجاح', detail: 'تم تنزيل التقرير بنجاح' });
    },
    error: (error) => {
      console.error('Error downloading PDF:', error);
      this.loadingPdf = false;
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل في تنزيل التقرير' });
    }
  });
}

exportToExcel() {
  if (this.inventoryStocktakings.length === 0) {
    this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'لا توجد بيانات للتصدير' });
    return;
  }

  const data = this.inventoryStocktakings.map((item: InventoryStocktakingModel, index: number) => ({
    'م': index + 1,
    'رقم المرجع': item.referenceNumber,
    'الوصف': item.description || '-',
    'تاريخ الجرد': formatDisplayDate(item.stocktakingDate),
    'تاريخ الإنشاء': formatDisplayDate(item.createdAt)
  }));

  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'جرد المخزن');
  XLSX.writeFile(wb, `تقرير_جرد_المخزن_${new Date().toISOString().split('T')[0]}.xlsx`);
  this.messageService.add({ severity: 'success', summary: 'نجاح', detail: 'تم تصدير البيانات بنجاح' });
}

printReport() {
  this.loadingPdf = true;
  this.inventoryStocktakingService.getReport().subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      this.loadingPdf = false;
    },
    error: (error) => {
      console.error('Error printing report:', error);
      this.loadingPdf = false;
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل في طباعة التقرير' });
    }
  });
}

openShareDialog() {
  this.showShareDialog = true;
  this.selectedShareMethod = '';
  this.shareEmail = '';
  this.sharePhone = '';
}

canShare(): boolean {
  if (!this.selectedShareMethod) return false;
  if (this.selectedShareMethod === 'email') return !!this.shareEmail && this.shareEmail.includes('@');
  if (this.selectedShareMethod === 'whatsapp') return !!this.sharePhone && this.sharePhone.length >= 10;
  return false;
}

shareReport() {
  this.loadingShare = true;
  const shareRequest = {
    method: this.selectedShareMethod,
    email: this.selectedShareMethod === 'email' ? this.shareEmail : null,
    phone: this.selectedShareMethod === 'whatsapp' ? this.sharePhone : null
  };

  this.inventoryStocktakingService.shareReport(shareRequest).subscribe({
    next: () => {
      this.loadingShare = false;
      this.showShareDialog = false;
      this.messageService.add({ 
        severity: 'success', 
        summary: 'نجاح', 
        detail: this.selectedShareMethod === 'email' ? 'تم إرسال التقرير بالبريد الإلكتروني' : 'تم إرسال التقرير بالواتساب' 
      });
    },
    error: (error) => {
      console.error('Error sharing report:', error);
      this.loadingShare = false;
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل في مشاركة التقرير' });
    }
  });
}

}