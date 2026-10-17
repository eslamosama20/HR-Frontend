import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { ResponseStatusCode } from 'src/app/enums/servers';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { BaseResponse } from 'src/app/models/base-response';
import { PurchaseInvoiceDetails } from 'src/app/models/invoice/purchase-invoice-details';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { formatDateOnlyToString, getSystemNow } from 'src/app/utils/dateUtils';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';

@Component({
  selector: 'app-purchase-vat-summary-report',
  templateUrl: './purchase-vat-summary-report.component.html',
  styleUrl: './purchase-vat-summary-report.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ToastModule,
    TranslateModule,
    FormsModule,
    CalendarModule,
    PanelModule,
    TabViewModule,
  ],
  providers: [ConfirmationService, MessageService]
})

export class PurchaseVatSummaryReportComponent implements OnInit {
  loadingSignal = signal(false);
  dateRange: Date[] = [];
  startDate;
  endDate;
  totalQuantity = 0;
  totalUnitPrice = 0; // Total unit price
  totalInvoicePrice = 0;
  totalInvoicePriceWithTax = 0;
  hasData = false;

  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  userPermissionsSignal = signal<PermissionModel[]>([]);

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }

  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  purchaseInvoiceReportSignal = signal<PurchaseInvoiceDetails[]>([]);
  get purchaseInvoiceReport(): PurchaseInvoiceDetails[] {
    return this.purchaseInvoiceReportSignal()
  }
  set purchaseInvoiceReport(purchaseInvoiceReport: PurchaseInvoiceDetails[]) {
    this.purchaseInvoiceReportSignal.set(purchaseInvoiceReport);
  }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;

  companyDetailsModel: CompanyDetailsModel | null = null;
  currentUser: UserAccountModel | null = null;

  // Share functionality
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private companyDetailsService: CompanyDetailsService,
    private fb: FormBuilder,
    private pdfUtilsService: PdfUtilsService,
    private router: Router
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.currentUser = res;
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  ngOnInit(): void {
    const currentYear = getSystemNow().getFullYear();
    this.startDate = new Date(currentYear, 0, 1);
    this.endDate = new Date(currentYear, 11, 31);
    this.dateRange = [this.startDate, this.endDate];
    this.getCompanyDetails();
    
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }

  getCompanyDetails() {
    this.companyDetailsService.getAll().subscribe({
      next: (value) => {
        this.companyDetailsModel = value[0];
      },
      error: (err) => {
        console.error('Error loading Company details', err);
      }
    });
  }

  handleSubmit() {
    if (!this.dateRange || this.dateRange.length !== 2 || !this.dateRange[0] || !this.dateRange[1]) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار نطاق التاريخ',
      });
      return;
    }

    this.loading = true;
    // Reset totals
    this.totalQuantity = 0;
    this.totalUnitPrice = 0;
    this.totalInvoicePrice = 0;
    this.totalInvoicePriceWithTax = 0;
    this.hasData = false;
    
    this.startDate = this.dateRange[0];
    this.endDate = this.dateRange[1];
    
    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchaseInvoiceService.GetPurchaseInvoicesDetails(startDate, endDate).subscribe(
      (res: BaseResponse<PurchaseInvoiceDetails[]>) => {
        if (res.errorCode === ResponseStatusCode.Success) {
          this.purchaseInvoiceReport = res.data;
          this.hasData = res.data && res.data.length > 0;

          let totalPriceSum = 0;
          this.purchaseInvoiceReport.forEach(i => {
            this.totalQuantity += i.totalItemQuantity;
            totalPriceSum += i.totalItemPrice;
            this.totalInvoicePrice += i.totalInvoicePrice;
            this.totalInvoicePriceWithTax += i.totalInvoicePriceWithTax;
          });

          // Total unit price (sum of all unit prices)
          this.totalUnitPrice = totalPriceSum;
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error fetching purchase invoice report', error);
        this.loading = false;
      }
    );
  }

  printPDF() {
    if (!this.startDate || !this.endDate || !this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchaseInvoiceService.printPurchaseInvoiceSummaryReportDocument(startDate, endDate, this.activeLanguage);
  }

  downloadPDF() {
    if (!this.startDate || !this.endDate || !this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchaseInvoiceService.downloadPurchaseInvoiceSummaryReportDocument(startDate, endDate, this.activeLanguage).subscribe({
      next: (blob) => {
        const fileName = `تقرير_القيمة_المضافة_للمشتريات_المختصر_${startDate}_${endDate}.pdf`;
        this.pdfUtilsService.downloadFile(blob, fileName);
      },
      error: (err) => {
        console.error('Download error', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تنزيل تقرير القيمة المضافة للمشتريات المختصر',
        });
      },
    });
  }

  exportToExcel() {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('WARNING'),
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    import("xlsx").then(xlsx => {
      const workbook = xlsx.utils.book_new();
      const worksheetData: any[][] = [];

      // Add header information
      worksheetData.push(['تقرير المشتريات المختصر']);
      worksheetData.push([`من تاريخ: ${formatDateOnlyToString(this.startDate)} - إلى تاريخ: ${formatDateOnlyToString(this.endDate)}`]);
      worksheetData.push([]); // Empty row

      // Add table headers
      const headers = ['إجمالي العدد', 'إجمالي سعر الوحدة', 'الإجمالي', 'الإجمالي بالضريبة'];
      worksheetData.push(headers);

      // Add data row
      worksheetData.push([
        this.totalQuantity.toFixed(2),
        this.totalUnitPrice.toFixed(2),
        this.totalInvoicePrice.toFixed(2),
        this.totalInvoicePriceWithTax.toFixed(2)
      ]);

      // Create worksheet
      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 20 }
      ];

      // Append worksheet to workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, 'التقرير');

      // Write file
      const fileName = `تقرير_المشتريات_المختصر_${formatDateOnlyToString(this.startDate)}_${formatDateOnlyToString(this.endDate)}`;
      xlsx.writeFile(workbook, `${fileName}.xlsx`);
    });
  }

  // Share functionality
  openShareDialog() {
    if (!this.startDate || !this.endDate || !this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }
    this.shareForm.reset();
    this.shareActiveTabIndex = 0;
    this.shareDialogVisible = true;
  }

  closeShareDialog() {
    this.shareDialogVisible = false;
    this.shareForm.reset();
  }

  submitShareEmail() {
    const email = (this.shareForm.get('email')?.value || '').trim();
    if (!email || this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);

    this.purchaseInvoiceService
      .sharePurchaseInvoiceSummaryReportByEmail(startDate, endDate, email, this.activeLanguage)
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم إرسال تقرير القيمة المضافة للمشتريات المختصر عبر البريد الإلكتروني بنجاح.',
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error('Share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال تقرير القيمة المضافة للمشتريات المختصر عبر البريد الإلكتروني.',
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        },
      });
  }

  submitShareWhatsApp() {
    const phoneRaw = (this.shareForm.get('whatsappNumber')?.value || '').trim();
    if (!phoneRaw || this.shareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال رقم جوال صحيح (8-15 رقم).',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    const phone = phoneRaw.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '');

    this.purchaseInvoiceService
      .sharePurchaseInvoiceSummaryReportByWhatsapp(startDate, endDate, phone, this.activeLanguage)
      .subscribe({
        next: (res) => {
          const links = this.extractWhatsAppLinks(res);
          if (links && links.length > 0) {
            this.openWhatsAppLink(links[0]);
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم فتح رابط واتساب للمشاركة.',
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'تحذير',
              detail: 'لم يتم العثور على رابط واتساب.',
            });
          }
        },
        error: (err) => {
          console.error('WhatsApp share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال تقرير القيمة المضافة للمشتريات المختصر عبر واتساب.',
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        },
      });
  }

  private extractWhatsAppLinks(res: any): string[] {
    if (res?.response?.whatsAppLink) {
      return [res.response.whatsAppLink];
    }
    if (res?.whatsAppLink) {
      return [res.whatsAppLink];
    }
    return [];
  }

  private openWhatsAppLink(url: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  navigateToPurchaseInvoiceReport() {
    if (!this.startDate || !this.endDate) {
      return;
    }
    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.router.navigate(['/reports/purchase-vat-total-report'], {
      queryParams: { startDate, endDate }
    });
  }
}
