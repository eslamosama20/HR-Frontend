import { Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { TranslateService } from "@ngx-translate/core";
import { ConfirmationService, MessageService, PrimeNGConfig } from "primeng/api";
import { Table } from 'primeng/table';

import { FormBuilder, FormGroup, Validators, FormControl } from "@angular/forms";
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthService } from "../../../../modules/auth";
import { TranslationService } from "../../../../modules/i18n";

import { MainSalesClassService } from "../../../../services/sales-classes-tree/main-sales-class.service";
import { MainPurchaseClassService } from "../../../../services/purchase-classes-tree/main-purchase-class.service";

import { ProductUnitService } from "../../../../services/inventory/product-unit.service";
import { StoreDetailsService } from "../../../../services/inventory/store-details.service";

import { MainSalesClassModel } from "../../../../models/sales-classes-tree/mainSalesClass.model";
import {
  MainPurchaseClassModel,
  normalizeMainPurchaseItemType
} from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { PermissionModel } from "../../../../models/auth/permission.model";
import { UserAccountModel } from "../../../../models/auth/userAccount.model";

import { StoreDetailsModel } from "../../../../models/inventory/storeDetails.model";
import { ProductUnitModel } from "../../../../models/inventory/productUnit.model";

import primengArTranslations from "../../../../utils/primengArTranslations";
import { HttpClient } from '@angular/common/http';
import { PdfUtilsService } from '../../../../services/pdf-utils.service';
import { environment } from '../../../../../environments/environment';
import { formatDisplayDate } from '../../../../utils/dateUtils';

// ✅ Remove class methods from model types (because API returns plain objects)
type StripModelMethods<T> = Omit<T, 'validate' | 'toJSON' | 'fromJSON'>;

// ✅ Plain shapes we will actually keep in tables
type PurchaseBase = StripModelMethods<MainPurchaseClassModel>;
type SalesBase = StripModelMethods<MainSalesClassModel>;

type PurchaseClassRow = Omit<PurchaseBase, 'createdAt'> & {
  createdAt: Date | null;
  classDisplayName: string;
  measurementUnitDisplayName: string;
};

type SalesClassRow = Omit<SalesBase, 'createdAt'> & {
  createdAt: Date | null;
  classDisplayName: string;
  measurementUnitDisplayName: string;
  classTypeDisplayName: string;
};

@Component({
  selector: 'app-inventory-management',
  templateUrl: './inventory-management.component.html',
  styleUrl: './inventory-management.component.scss',
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }]
})
export class InventoryManagementComponent implements OnInit {

  // ✅ table refs
  @ViewChild('dtPurchase') dtPurchase?: Table;
  @ViewChild('dtSales') dtSales?: Table;

  // ✅ global search input
  globalSearchControl = new FormControl<string>('', { nonNullable: true });

  // ✅ active tab index: 0 = purchase, 1 = sales
  activeTabIndex = 0;

  // Export/Share properties
  loadingPdf = false;
  loadingShare = false;
  shareDialogVisible = false;
  selectedShareMethod = '';
  shareEmail = '';
  sharePhone = '';
  shareMethodOptions = [
    { label: 'البريد الإلكتروني', value: 'email' },
    { label: 'واتساب', value: 'whatsapp' }
  ];

  private storeDetailsSignal = signal<StoreDetailsModel[]>([]);

  private mainSalesClassesSignal = signal<SalesClassRow[]>([]);
  get mainSalesClasses(): SalesClassRow[] { return this.mainSalesClassesSignal(); }
  set mainSalesClasses(value: SalesClassRow[]) { this.mainSalesClassesSignal.set(value); }

  private mainPurchaseClassesSignal = signal<PurchaseClassRow[]>([]);
  get mainPurchaseClasses(): PurchaseClassRow[] { return this.mainPurchaseClassesSignal(); }
  set mainPurchaseClasses(value: PurchaseClassRow[]) { this.mainPurchaseClassesSignal.set(value); }

  loading = true;

  private userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] { return this.userPermissionsSignal(); }
  set userPermissions(permissions: PermissionModel[]) { this.userPermissionsSignal.set(permissions); }

  private mainSalesClassDialogVisibleSignal = signal(false);
  private mainPurchaseClassDialogVisibleSignal = signal(false);

  get mainSalesClassDialogVisible() { return this.mainSalesClassDialogVisibleSignal(); }
  set mainSalesClassDialogVisible(value: boolean) { this.mainSalesClassDialogVisibleSignal.set(value); }

  get mainPurchaseClassDialogVisible() { return this.mainPurchaseClassDialogVisibleSignal(); }
  set mainPurchaseClassDialogVisible(value: boolean) { this.mainPurchaseClassDialogVisibleSignal.set(value); }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;

  productUnitFormGroup: FormGroup;

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public mainSalesClassService: MainSalesClassService,
    public mainPurchaseClassService: MainPurchaseClassService,
    private productUnitService: ProductUnitService,
    private storeDetailsService: StoreDetailsService,
    private router: Router,
    private http: HttpClient,
    private pdfUtils: PdfUtilsService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userPermissions =
          res.userRoles
            .map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
      }
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.productUnitFormGroup = this.fb.group({
      storeDetailsId: [null, Validators.required],
      mainSalesClassId: [null],
      mainPurchaseClassId: [null],
      quantity: [0, Validators.min(0.01)],
      batchNo: [null],
      expiryDate: [null]
    });
  }

  ngOnInit(): void {
    this.loadMainSalesClasses();
    this.loadMainPurchaseClasses();
    this.loadOptions();

    // ✅ search updates ONLY active table
    this.globalSearchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => {
        const v = (value ?? '').trim();

        // 0 => Purchase tab, 1 => Sales tab
        if (this.activeTabIndex === 0) {
          this.dtPurchase?.filterGlobal(v, 'contains');
          // امسح global filter من جدول المبيعات
          this.dtSales?.filterGlobal('', 'contains');
        } else {
          this.dtSales?.filterGlobal(v, 'contains');
          // امسح global filter من جدول المشتريات
          this.dtPurchase?.filterGlobal('', 'contains');
        }
      });
  }

  // ✅ receives event from p-tabView (PrimeNG)
  onTabChange(event: any): void {
    this.activeTabIndex = event?.index ?? 0;
    this.resetGlobalSearch();
  }

  resetGlobalSearch(): void {
    this.globalSearchControl.setValue('', { emitEvent: false });

    // clear filters/state for both tables
    this.dtPurchase?.clear();
    this.dtSales?.clear();
  }

  // ===== Helpers =====
  private pickNameByLang(arabic?: string, english?: string): string {
    const ar = arabic ?? '';
    const en = english ?? '';
    return this.activeLanguage === 'en' ? (en || ar) : (ar || en);
  }

  private getClassDisplayName(entry: { referenceCode?: string; englishName?: string; arabicName?: string }): string {
    const name = this.pickNameByLang(entry?.arabicName, entry?.englishName);
    const ref = entry?.referenceCode ?? '';
    if (ref && name) return `${ref} | ${name}`;
    return ref || name || '';
  }

  private getMeasurementUnitDisplayName(
    unit: { englishName?: string; arabicName?: string; englishSymbol?: string; arabicSymbol?: string } | null | undefined
  ): string {
    if (!unit) return '';
    const name = this.pickNameByLang(unit.arabicName, unit.englishName);
    const symbol = this.pickNameByLang(unit.arabicSymbol, unit.englishSymbol);
    if (name && symbol) return `${name} (${symbol})`;
    return name || symbol || '';
  }

  private getClassTypeDisplayName(classType?: string): string {
    if (!classType) return '';
    return classType === 'Direct'
      ? this.translate.instant('DATA.DIRECT')
      : this.translate.instant('DATA.COMPOUND');
  }

  private toDateSafe(value: any): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private sortNewestFirst<T extends { createdAt: Date | null }>(rows: T[]): T[] {
    return rows.sort((a, b) => {
      const at = a.createdAt ? a.createdAt.getTime() : 0;
      const bt = b.createdAt ? b.createdAt.getTime() : 0;
      return bt - at;
    });
  }

  // ===== Loaders =====
  loadMainSalesClasses() {
    this.loading = true;
    this.mainSalesClassService.getAll().subscribe({
      next: (mainSalesClasses: any[]) => {
        const rows: SalesClassRow[] = mainSalesClasses.map((x: any) => ({
          ...x,
          createdAt: this.toDateSafe(x.createdAt),
          classDisplayName: this.getClassDisplayName(x),
          measurementUnitDisplayName: this.getMeasurementUnitDisplayName(x.measurementUnit),
          classTypeDisplayName: this.getClassTypeDisplayName(x.classType),
        }));

        this.mainSalesClasses = this.sortNewestFirst(rows);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('DATA.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_SALES_CLASSES_LOADING_ERROR')
        });
      }
    });
  }

  loadMainPurchaseClasses() {
    this.loading = true;
    this.mainPurchaseClassService.getAll().subscribe({
      next: (mainPurchaseClasses: any[]) => {
        const rows: PurchaseClassRow[] = mainPurchaseClasses.map((x: any) => ({
          ...x,
          createdAt: this.toDateSafe(x.createdAt),
          classDisplayName: this.getClassDisplayName(x),
          measurementUnitDisplayName: this.getMeasurementUnitDisplayName(x.measurementUnit),
        }));

        this.mainPurchaseClasses = this.sortNewestFirst(rows);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('DATA.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASSES_LOADING_ERROR')
        });
      }
    });
  }

  loadOptions() {
    this.storeDetailsService.getAll().subscribe(elements => {
      this.storeDetailsSignal.set(elements);
    });
  }

  get storeDetailsOptions(): Array<{ label: string, value: string }> {
    return this.storeDetailsSignal().map(x => ({
      label: this.activeLanguage === "en" ? x.englishName : x.arabicName,
      value: x.id
    }));
  }

  // ===== Dialogs / actions =====
  showPurchaseProductCreationDialog(classId: string) {
    this.mainPurchaseClassDialogVisible = true;
    this.productUnitFormGroup.controls['mainPurchaseClassId'].setValue(classId);
  }

  showSalesProductCreationDialog(classId: string) {
    this.mainSalesClassDialogVisible = true;
    this.productUnitFormGroup.controls['mainSalesClassId'].setValue(classId);
  }

  closePurchaseProductCreationDialog() {
    this.mainPurchaseClassDialogVisible = false;
    this.productUnitFormGroup.reset({
      storeDetailsId: null,
      mainSalesClassId: null,
      mainPurchaseClassId: null,
      quantity: 1,
      batchNo: null,
      expiryDate: null
    });
  }

  closeSalesProductCreationDialog() {
    this.mainSalesClassDialogVisible = false;
    this.productUnitFormGroup.reset({
      storeDetailsId: null,
      mainSalesClassId: null,
      mainPurchaseClassId: null,
      quantity: 1,
      batchNo: null,
      expiryDate: null
    });
  }

  savePurchaseProductUnit() {
    const v = this.productUnitFormGroup.value;
    const tracking = this.getPurchaseTrackingRequirements(v.mainPurchaseClassId);
    const productUnit = new ProductUnitModel();
    productUnit.mainPurchaseClassId = v.mainPurchaseClassId;
    productUnit.storeDetailsId = v.storeDetailsId;
    productUnit.quantity = v.quantity;
    productUnit.batchNo = tracking.needsBatch && v.batchNo ? `${v.batchNo}`.trim() : null;
    productUnit.expiryDate = tracking.needsExpiry && v.expiryDate ? v.expiryDate : null;

    this.productUnitService.create(productUnit).subscribe({
      next: () => {
        this.closePurchaseProductCreationDialog();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('DATA.CONFIRMED'),
          detail: this.translate.instant('DATA.PRODUCT_UNIT_CREATED')
        });
        this.loadMainPurchaseClasses();
      },
      error: (error) => {
        console.log('Error Saving Product Unit', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('DATA.ERROR'),
          detail: this.translate.instant('DATA.PRODUCT_UNIT_SAVING_ERROR')
        });
      }
    });
  }

  private getPurchaseTrackingRequirements(mainPurchaseClassId: string): { needsBatch: boolean; needsExpiry: boolean } {
    const product = this.mainPurchaseClasses.find(item => item.id === mainPurchaseClassId);
    const isMedication = normalizeMainPurchaseItemType(product?.itemType) === 'medication';

    return {
      needsBatch: !!product?.needsBatch || isMedication,
      needsExpiry: !!product?.needsExpiry || isMedication
    };
  }

  saveSalesProductUnit() {
    const v = this.productUnitFormGroup.value;
    const productUnit = new ProductUnitModel();
    productUnit.mainSalesClassId = v.mainSalesClassId;
    productUnit.storeDetailsId = v.storeDetailsId;
    productUnit.quantity = v.quantity;

    this.productUnitService.create(productUnit).subscribe({
      next: () => {
        this.closeSalesProductCreationDialog();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('DATA.PRODUCT_UNIT_CREATED')
        });
        this.loadMainSalesClasses();
      },
      error: (error) => {
        console.log('Error Saving Product Unit', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('DATA.ERROR'),
          detail: this.translate.instant('DATA.PRODUCT_UNIT_SAVING_ERROR')
        });
      }
    });
  }

  navigateToInventoryEntryPermitCreation() {
    this.router.navigate(['/permits/inventory-permits/new/entry']);
  }

  // Export to Excel
  exportToExcel(): void {
    const currentData = this.activeTabIndex === 0 ? this.mainPurchaseClasses : this.mainSalesClasses;
    
    if (!currentData || currentData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      const data = this.activeTabIndex === 0 
        ? this.mainPurchaseClasses.map((item, index) => ({
            'م': index + 1,
            'الكود': item.referenceCode || '-',
            'الاسم': this.activeLanguage === 'ar' ? (item.arabicName || '-') : (item.englishName || '-'),
            'وحدة القياس': item.measurementUnitDisplayName || '-',
            'عدد الوحدات': item.productUnitsCount || 0,
            'تاريخ الإنشاء': item.createdAt ? formatDisplayDate(item.createdAt) : '-'
          }))
        : this.mainSalesClasses.map((item, index) => ({
            'م': index + 1,
            'الكود': item.referenceCode || '-',
            'الاسم': this.activeLanguage === 'ar' ? (item.arabicName || '-') : (item.englishName || '-'),
            'وحدة القياس': item.measurementUnitDisplayName || '-',
            'عدد الوحدات': item.productUnitsCount || 0,
            'نوع الصنف': item.classTypeDisplayName || '-',
            'تاريخ الإنشاء': item.createdAt ? formatDisplayDate(item.createdAt) : '-'
          }));

      // Add summary rows
      const totalClasses = currentData.length;
      const totalUnits = currentData.reduce((sum, item) => sum + (item.productUnitsCount || 0), 0);

      data.push({} as any); // Empty row
      data.push({
        'م': '',
        'الكود': 'الإجماليات',
        'الاسم': '',
        'وحدة القياس': '',
        'عدد الوحدات': '',
        ...(this.activeTabIndex === 1 ? { 'نوع الصنف': '' } : {}),
        'تاريخ الإنشاء': ''
      } as any);
      data.push({
        'م': '',
        'الكود': 'إجمالي الأصناف',
        'الاسم': totalClasses.toString(),
        'وحدة القياس': '',
        'عدد الوحدات': '',
        ...(this.activeTabIndex === 1 ? { 'نوع الصنف': '' } : {}),
        'تاريخ الإنشاء': ''
      } as any);
      data.push({
        'م': '',
        'الكود': 'إجمالي الوحدات',
        'الاسم': totalUnits.toLocaleString('ar-SA'),
        'وحدة القياس': '',
        'عدد الوحدات': '',
        ...(this.activeTabIndex === 1 ? { 'نوع الصنف': '' } : {}),
        'تاريخ الإنشاء': ''
      } as any);

      const filename = this.activeTabIndex === 0 
        ? `تقرير_أصناف_المشتريات_${this.formatDateForFileName(new Date())}`
        : `تقرير_أصناف_المبيعات_${this.formatDateForFileName(new Date())}`;
      
      this.pdfUtils.exportToExcel(data, filename);
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح التصدير',
        detail: 'تم تصدير البيانات إلى Excel بنجاح'
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في التصدير',
        detail: 'فشل في تصدير الملف'
      });
    }
  }

  // Download PDF
  downloadPDF(): void {
    const currentData = this.activeTabIndex === 0 ? this.mainPurchaseClasses : this.mainSalesClasses;
    
    if (!currentData || currentData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    this.loadingPdf = true;
    
    // Call backend to generate professional PDF
    const endpoint = this.activeTabIndex === 0 
      ? 'MainPurchaseClass/Report/classes-document' 
      : 'MainSalesClass/Report/classes-document';
    const apiUrl = `${environment.server_urls[environment.active_server].accountingUrl}${endpoint}`;
    
    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = this.activeTabIndex === 0 
          ? `purchase_classes_${this.formatDateForFileName(new Date())}.pdf`
          : `sales_classes_${this.formatDateForFileName(new Date())}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'نجح التصدير',
          detail: 'تم تصدير التقرير كملف PDF بنجاح'
        });
        this.loadingPdf = false;
      },
      error: (error) => {
        console.error('Error generating PDF:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في إنشاء ملف PDF'
        });
        this.loadingPdf = false;
      }
    });
  }

  // Print Report
  printPDF(): void {
    const currentData = this.activeTabIndex === 0 ? this.mainPurchaseClasses : this.mainSalesClasses;
    
    if (!currentData || currentData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للطباعة'
      });
      return;
    }

    // Call backend to generate professional PDF
    const endpoint = this.activeTabIndex === 0 
      ? 'MainPurchaseClass/Report/classes-document' 
      : 'MainSalesClass/Report/classes-document';
    const apiUrl = `${environment.server_urls[environment.active_server].accountingUrl}${endpoint}`;
    
    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      },
      error: (error) => {
        console.error('Error generating PDF:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في إنشاء ملف PDF'
        });
      }
    });
  }

  printReport(): void {
    this.printPDF();
  }

  // Open Share Dialog
  openShareDialog(): void {
    const currentData = this.activeTabIndex === 0 ? this.mainPurchaseClasses : this.mainSalesClasses;
    
    if (!currentData || currentData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    
    this.shareDialogVisible = true;
    this.selectedShareMethod = '';
    this.shareEmail = '';
    this.sharePhone = '';
  }

  closeShareDialog(): void {
    this.shareDialogVisible = false;
  }

  canShare(): boolean {
    if (!this.selectedShareMethod) return false;
    if (this.selectedShareMethod === 'email') return !!this.shareEmail && this.shareEmail.includes('@');
    if (this.selectedShareMethod === 'whatsapp') return !!this.sharePhone && this.sharePhone.length >= 10;
    return false;
  }

  // Share Report
  shareReport(): void {
    if (!this.canShare()) {
      return;
    }

    this.loadingShare = true;
    
    // Use backend share endpoint
    const isPurchase = this.activeTabIndex === 0;
    const endpoint = isPurchase ? 'MainPurchaseClass/Report/share' : 'MainSalesClass/Report/share';
    const apiUrl = `${environment.server_urls[environment.active_server].accountingUrl}${endpoint}`;
    
    const shareRequest = {
      method: this.selectedShareMethod,
      email: this.selectedShareMethod === 'email' ? this.shareEmail : null,
      phone: this.selectedShareMethod === 'whatsapp' ? this.sharePhone : null
    };

    this.http.post(apiUrl, shareRequest).subscribe({
      next: () => {
        this.loadingShare = false;
        this.shareDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: this.selectedShareMethod === 'email' 
            ? 'تم إرسال التقرير بالبريد الإلكتروني' 
            : 'تم إرسال التقرير بالواتساب'
        });
      },
      error: (error) => {
        console.error('Error sharing report:', error);
        this.loadingShare = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في مشاركة التقرير'
        });
      }
    });
  }

  private formatDateForFileName(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  loadAll(): void {
    this.loadMainSalesClasses();
    this.loadMainPurchaseClasses();
  }
}
