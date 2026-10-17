import {Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {CommonModule, DatePipe, registerLocaleData} from "@angular/common";
import {
  normalizeStoreCategory,
  StoreCategory,
  StoreDetailsModel,
  StoreType,
  toLegacyStoreType
} from "../../../models/inventory/storeDetails.model";
import {StoreDetailsService} from "../../../services/inventory/store-details.service";
import {FormsModule} from '@angular/forms';
import {StoreStatusService} from "../../../services/inventory/store-status.service";
import {StoreStatusModel} from "../../../models/inventory/storeStatus.model";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';

import localeArSa from '@angular/common/locales/ar-SA';
import {TranslationService} from "../../../modules/i18n";
import {MainAccountModel} from "../../../models/accounting/mainAccount.model";
import {MainAccountService} from "../../../services/accounting/main-account.service";
import {MessageService, ConfirmationService} from 'primeng/api';
import {Table, TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TooltipModule} from 'primeng/tooltip';
import {DialogModule} from 'primeng/dialog';
import {DropdownModule} from 'primeng/dropdown';
import {ToastModule} from 'primeng/toast';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {TabViewModule} from 'primeng/tabview';
import {ReactiveFormsModule, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {PdfUtilsService} from '../../../services/pdf-utils.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { PERMISSIONS } from '../../../config/permissions';
import { formatDisplayDate } from '../../../utils/dateUtils';

registerLocaleData(localeArSa, 'ar-SA');

@Component({
  selector: 'app-store-details',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    DialogModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    TranslateModule
  ],
  providers: [DatePipe, MessageService, ConfirmationService, {provide: LOCALE_ID, useValue: 'ar-SA'}],
  templateUrl: './store-details.component.html',
  styleUrl: './store-details.component.scss',
})
export class StoreDetailsComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  @ViewChild('dt') dt!: Table;
  
  // Loading states
  loading = false;
  loadingPdf = false;
  saving = false;
  loadingShare = false;
  
  // Search
  searchValue = '';
  
  // Dialog
  showDialog = false;
  editMode = false;
  
  // Share
  shareDialogVisible = false;
  selectedShareMethod = 'email';
  shareEmail = '';
  sharePhone = '';
  
  shareMethodOptions = [
    { label: 'البريد الإلكتروني', value: 'email' },
    { label: 'واتساب', value: 'whatsapp' }
  ];
  
  // Form data
  formData: any = {
    arabicName: '',
    englishName: '',
    storeCategory: StoreCategory.General,
    storeType: StoreType.Store,
    storeStatusId: null,
    mainAccountId: null
  };
  
  // Options
  storeTypeOptions: Array<{ label: string, value: StoreCategory | StoreType }> = [
    { label: 'متجر', value: StoreType.Store },
    { label: 'مستودع', value: StoreType.Warehouse }
  ];

  private mainAccountSignal = signal<MainAccountModel[]>([]);

  get mainAccount() {
    return this.mainAccountSignal();
  }
  set mainAccount(mainAccount: MainAccountModel[]) {
    this.mainAccountSignal.set(mainAccount);
  }
  get mainAccountOptions() {
    return this.mainAccount.map(m => ({
      label: this.activeLanguage == "en" ? m.englishName : m.arabicName,
      value: m.id
    }));
  }

  private dataSignal = signal<StoreDetailsModel[]>([]);
  private storeStatusSignal = signal<StoreStatusModel[]>([]);
  activeLanguage: string = 'en';
  
  constructor(
    public storeDetailsService: StoreDetailsService,
    public storeStatusService: StoreStatusService,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private translationService: TranslationService,
    private mainAccountService: MainAccountService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private http: HttpClient,
    private pdfUtils: PdfUtilsService,
    public authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.storeTypeOptions = [
      { label: this.activeLanguage === 'ar' ? 'عام' : 'General', value: StoreCategory.General },
      { label: this.activeLanguage === 'ar' ? 'صيدلية' : 'Pharmacy', value: StoreCategory.Pharmacy },
      { label: this.activeLanguage === 'ar' ? 'مستودع' : 'Warehouse', value: StoreCategory.Warehouse },
      { label: this.activeLanguage === 'ar' ? 'نقطة بيع' : 'Retail', value: StoreCategory.Retail }
    ];
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  get data(): StoreDetailsModel[] {
    return this.dataSignal();
  }

  set data(value: StoreDetailsModel[]) {
    this.dataSignal.set(value);
  }

  get storeStatusOptions(): Array<{ label: string, value: string }> {
    return this.storeStatusSignal().map(x => ({
      label: this.activeLanguage === 'ar' ? x.arabicName : x.englishName,
      value: x.id
    }));
  }
  
  // Search
  onSearch(event: any) {
    this.dt?.filterGlobal(event.target.value, 'contains');
  }
  
  // Dialog methods
  openAddDialog() {
    this.editMode = false;
    this.formData = {
      arabicName: '',
      englishName: '',
      storeCategory: StoreCategory.General,
      storeType: StoreType.Store,
      storeStatusId: null,
      mainAccountId: null
    };
    this.showDialog = true;
  }
  
  openEditDialog(store: StoreDetailsModel) {
    this.editMode = true;
    this.formData = {
      id: store.id,
      arabicName: store.arabicName,
      englishName: store.englishName,
      storeCategory: normalizeStoreCategory(store.storeCategory ?? store.storeType),
      storeType: toLegacyStoreType(store.storeCategory ?? store.storeType),
      storeStatusId: store.storeStatusId,
      mainAccountId: store.mainAccountId
    };
    this.showDialog = true;
  }
  
  closeDialog() {
    this.showDialog = false;
    this.formData = {};
  }
  
  saveStore() {
    if (!this.formData.arabicName || !this.formData.englishName || !this.formData.storeCategory) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'يرجى ملء جميع الحقول المطلوبة'
      });
      return;
    }
    
    this.saving = true;
    
    const cleanedFormData = {
      ...this.formData,
      storeCategory: normalizeStoreCategory(this.formData.storeCategory ?? this.formData.storeType),
      storeType: toLegacyStoreType(this.formData.storeCategory ?? this.formData.storeType),
      storeStatusId: this.formData.storeStatusId && this.formData.storeStatusId !== '00000000-0000-0000-0000-000000000000' 
        ? this.formData.storeStatusId 
        : null,
      mainAccountId: this.formData.mainAccountId && this.formData.mainAccountId !== '00000000-0000-0000-0000-000000000000' 
        ? this.formData.mainAccountId 
        : null
    };
    
    if (this.editMode && cleanedFormData.id) {
      const elementToUpdate = this.data.find(x => x.id === cleanedFormData.id);
      const updatedElement = new StoreDetailsModel({
        ...elementToUpdate,
        ...cleanedFormData,
      });
      
      this.storeDetailsService.update(updatedElement).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم تحديث المخزن بنجاح'
          });
          this.loadStoreDetails();
          this.closeDialog();
          this.saving = false;
        },
        error: (error) => {
          console.error('Error updating store:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء تحديث المخزن'
          });
          this.saving = false;
        }
      });
    } else {
      const newEntity = new StoreDetailsModel(cleanedFormData);
      
      this.storeDetailsService.create(newEntity).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم إضافة المخزن بنجاح'
          });
          this.loadStoreDetails();
          this.closeDialog();
          this.saving = false;
        },
        error: (error) => {
          console.error('Error creating store:', error);
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || 'حدث خطأ أثناء إضافة المخزن';
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: detailMsg
          });
          this.saving = false;
        }
      });
    }
  }
  
  confirmDelete(store: StoreDetailsModel) {
    this.confirmationService.confirm({
      message: `هل أنت متأكد من حذف المخزن "${store.arabicName}"؟`,
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم، احذف',
      rejectLabel: 'إلغاء',
      accept: () => {
        this.storeDetailsService.delete(store.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم حذف المخزن بنجاح'
            });
            this.loadStoreDetails();
          },
          error: (error) => {
            console.error('Error deleting store:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء حذف المخزن'
            });
          }
        });
      }
    });
  }
  
  // Export methods
  exportToExcel(): void {
    if (!this.data || this.data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      // Prepare store data
      const exportData = this.data.map((store, index) => ({
        'م': index + 1,
        'الاسم بالعربية': store.arabicName || '-',
        'الاسم بالإنجليزية': store.englishName || '-',
        'نوع المخزن': store.storeType === 'Store' ? 'متجر' : 'مستودع',
        'حالة المخزن': this.activeLanguage === 'ar' ? (store.storeStatus?.arabicName || '-') : (store.storeStatus?.englishName || '-'),
        'له حساب رئيسي': store.mainAccountId ? 'نعم' : 'لا',
        'تاريخ الإنشاء': store.createdAt ? formatDisplayDate(store.createdAt) : '-'
      }));

      // Add summary row
      const totalStores = this.data.length;
      const storeCount = this.data.filter(s => normalizeStoreCategory(s.storeCategory ?? s.storeType) === StoreCategory.General).length;
      const pharmacyCount = this.data.filter(s => normalizeStoreCategory(s.storeCategory ?? s.storeType) === StoreCategory.Pharmacy).length;
      const warehouseCount = this.data.filter(s => normalizeStoreCategory(s.storeCategory ?? s.storeType) === StoreCategory.Warehouse).length;
      const retailCount = this.data.filter(s => normalizeStoreCategory(s.storeCategory ?? s.storeType) === StoreCategory.Retail).length;
      const withMainAccount = this.data.filter(s => s.mainAccountId).length;

      exportData.push({} as any); // Empty row
      exportData.push({
        'م': '',
        'الاسم بالعربية': 'الإجماليات',
        'الاسم بالإنجليزية': '',
        'نوع المخزن': '',
        'حالة المخزن': '',
        'له حساب رئيسي': '',
        'تاريخ الإنشاء': ''
      } as any);
      exportData.push({
        'م': '',
        'الاسم بالعربية': 'إجمالي المخازن',
        'الاسم بالإنجليزية': totalStores.toString(),
        'نوع المخزن': '',
        'حالة المخزن': '',
        'له حساب رئيسي': '',
        'تاريخ الإنشاء': ''
      } as any);
      exportData.push({
        'م': '',
        'الاسم بالعربية': 'عدد المتاجر',
        'الاسم بالإنجليزية': storeCount.toString(),
        'نوع المخزن': '',
        'حالة المخزن': '',
        'له حساب رئيسي': '',
        'تاريخ الإنشاء': ''
      } as any);
      exportData.push({
        'م': '',
        'الاسم بالعربية': 'عدد المستودعات',
        'الاسم بالإنجليزية': warehouseCount.toString(),
        'نوع المخزن': '',
        'حالة المخزن': '',
        'له حساب رئيسي': '',
        'تاريخ الإنشاء': ''
      } as any);
      exportData.push({
        'م': '',
        'الاسم بالعربية': 'مخازن لها حساب رئيسي',
        'الاسم بالإنجليزية': withMainAccount.toString(),
        'نوع المخزن': '',
        'حالة المخزن': '',
        'له حساب رئيسي': '',
        'تاريخ الإنشاء': ''
      } as any);

      this.pdfUtils.exportToExcel(exportData, `تقرير_المخازن_${this.formatDateForFileName(new Date())}`);
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح التصدير',
        detail: 'تم تصدير الملف بنجاح'
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
  
  printPDF(): void {
    if (!this.data || this.data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للطباعة'
      });
      return;
    }

    // Call backend to generate professional PDF
    const apiUrl = `${environment.server_urls[environment.active_server].inventoryUrl}StoreDetails/Report/stores-document`;
    
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

  downloadPDF(): void {
    if (!this.data || this.data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    this.loadingPdf = true;
    
    // Call backend to generate professional PDF
    const apiUrl = `${environment.server_urls[environment.active_server].inventoryUrl}StoreDetails/Report/stores-document`;
    
    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stores_${this.formatDateForFileName(new Date())}.pdf`;
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
  
  printReport(): void {
    this.printPDF();
  }
  
  // Share methods
  openShareDialog(): void {
    if (!this.data || this.data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    
    this.shareDialogVisible = true;
    this.selectedShareMethod = 'email';
    this.shareEmail = '';
    this.sharePhone = '';
  }
  
  canShare(): boolean {
    if (this.selectedShareMethod === 'email') return !!this.shareEmail && this.shareEmail.includes('@');
    if (this.selectedShareMethod === 'whatsapp') return !!this.sharePhone && this.sharePhone.length >= 10;
    return false;
  }
  
  shareReport(): void {
    if (!this.canShare()) {
      return;
    }

    this.loadingShare = true;
    
    const apiUrl = `${environment.server_urls[environment.active_server].inventoryUrl}storeDetails/Report/share`;
    
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

  ngOnInit(): void {
    this.loadStoreDetails();
    this.loadStoreStatus();
    this.loadMainAccounts();
  }

  loadMainAccounts() {
    this.mainAccountService.getAll().subscribe({
      next: data => {
        console.log(data);
        this.mainAccount = data;
      },
      error: () => {
        alert('Error loading main accounts');
      }
    });
  }

  loadStoreDetails() {
    this.loading = true;
    this.storeDetailsService.getAll().subscribe({
      next: (elements) => {
        this.data = (elements || []).map(element => new StoreDetailsModel(element));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل البيانات'
        });
      }
    });
  }

  loadStoreStatus() {
    this.storeStatusService.getAll().subscribe(elements => {
      this.storeStatusSignal.set(elements);
    });
  }

  getStoreCategoryLabel(value?: StoreCategory | StoreType | string | null): string {
    switch (normalizeStoreCategory(value)) {
      case StoreCategory.Pharmacy:
        return this.activeLanguage === 'ar' ? 'صيدلية' : 'Pharmacy';
      case StoreCategory.Warehouse:
        return this.activeLanguage === 'ar' ? 'مستودع' : 'Warehouse';
      case StoreCategory.Retail:
        return this.activeLanguage === 'ar' ? 'نقطة بيع' : 'Retail';
      case StoreCategory.General:
      default:
        return this.activeLanguage === 'ar' ? 'عام' : 'General';
    }
  }

  getStoreCategoryBadgeClass(value?: StoreCategory | StoreType | string | null): string {
    switch (normalizeStoreCategory(value)) {
      case StoreCategory.Pharmacy:
        return 'badge-pharmacy';
      case StoreCategory.Warehouse:
        return 'badge-warehouse';
      case StoreCategory.Retail:
        return 'badge-retail';
      case StoreCategory.General:
      default:
        return 'badge-general';
    }
  }
}
