import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { TabMenuModule } from 'primeng/tabmenu';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { ResponseStatusCode } from 'src/app/enums/servers';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { BaseResponse } from 'src/app/models/base-response';
import { PurchaseInvoiceDetails } from 'src/app/models/invoice/purchase-invoice-details';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { AbsoluteValuePipe } from 'src/app/pipes/absolute-value.pipe';
import { TrailBalanceService } from 'src/app/services/accounting/trail-balance.service';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { formatDateOnlyToString, formatDisplayDate, getSystemNow } from 'src/app/utils/dateUtils';
import { saveAs } from 'file-saver';
import { ExcelService } from 'src/app/services/excel/excel.service';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { pipe } from 'rxjs';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";

@Component({
  selector: 'app-purchase-vat-total-report',
  standalone: true,
  templateUrl: './purchase-vat-total-report.component.html',
  styleUrl: './purchase-vat-total-report.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ToastModule,
    TableModule,
    DropdownModule,
    MultiSelectModule,
    TranslateModule,
    FormsModule,
    CalendarModule,
    PanelModule,
    InputSwitchModule,
    TabMenuModule,
    TabViewModule,
    PrintDocumentComponent,
    CustomDatePipe,
    RouterModule
  ],
  providers: [ConfirmationService, MessageService]
})
export class PurchaseVatTotalReportComponent implements OnInit {
  loadingSignal = signal(false);
  dateRange: Date[] = [];
  startDate;
  endDate;
  totalPrice = 0;
  totalQuantity = 0;
  totalInvoicePrice = 0;
  totalInvoicePriceWithTax = 0;
  totalVAT = 0;
  isSubmitting = false;
  isHidden = true
  companyDetailsModel: CompanyDetailsModel | null = null
  purchaseInvoicesFlattened : any[]
  reportColumns = []
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

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


  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private excelService: ExcelService,
    private companyDetailsService: CompanyDetailsService,
    private cdf: ChangeDetectorRef,
    private pdfUtilsService: PdfUtilsService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute

  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }


  ngOnInit(): void {
    this.getCompanyDetails();
    this.resetTotals();

    const currentYear = getSystemNow().getFullYear();
    this.startDate = new Date(currentYear, 0, 1);
    this.endDate = new Date(currentYear, 11, 31);
    this.dateRange = [this.startDate, this.endDate];

    // Read query parameters
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['startDate']) {
        this.startDate = new Date(params['startDate']);
      }
      if (params['endDate']) {
        this.endDate = new Date(params['endDate']);
      }
      if (params['endDate']) {
        this.endDate = new Date(params['endDate']);
      }
      // Update dateRange when params change
      if (params['startDate'] && params['endDate']) {
        this.dateRange = [this.startDate, this.endDate];
        setTimeout(() => {
          this.handleSubmit();
        }, 100);
      }
    });

    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });

    this.reportColumns = [
      { field: 'invoiceNo', label: this.translateService.instant('INVOICE.INVOICENO')},
      { field:  this.activeLanguage === "ar" ? 'suppilerArabicName': 'suppilerEnglishName', label: this.translateService.instant('INVOICE.SUPPLIERNAME')},
      { field: 'description', label: this.translateService.instant('INVOICE.DESCRIPTION')},
      { field: 'issueDate', label: this.translateService.instant('INVOICE.ISSUE_DATE'), pipe: 'date' },
      { field: 'referenceCode', label: this.translateService.instant('INVOICE.ITEM_CODE') },
      { field: this.activeLanguage === "ar" ? 'itemArabicName': 'itemEnglishName', label: this.translateService.instant('INVOICE.ITEMNAME') },
      { field: 'quantity', label: this.translateService.instant('INVOICE.QUANTITY'),pipe: 'number' },
      { field: 'price', label: this.translateService.instant('DATA.UNIT_PRICE'), pipe: 'number' },
      { field: 'totalPrice', label: this.translateService.instant('INVOICE.TOTAL'), pipe: 'number' },
      { field: 'totalPriceWithTax', label: this.translateService.instant('INVOICE.TOTAL_WITH_TAX'), pipe: 'number' },
      { field: 'isTaxExempted', label: this.translateService.instant('DATA.IS_TAX_EXEMPTED'), pipe: 'boolean' }
    ];
  }

  private resetTotals(): void {
    this.totalPrice = 0;
    this.totalQuantity = 0;
    this.totalInvoicePrice = 0;
    this.totalInvoicePriceWithTax = 0;
    this.totalVAT = 0;
  }


  handleSubmit() {
    this.loading = true;
    this.isSubmitting = true;

    // Reset totals before recalculating
    this.resetTotals();

    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
      this.startDate = this.dateRange[0];
      this.endDate = this.dateRange[1];
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchaseInvoiceService.GetPurchaseInvoicesDetails(startDate, endDate).subscribe(
      (res: BaseResponse<PurchaseInvoiceDetails[]>) => {
        if (res.errorCode === ResponseStatusCode.Success) {
          console.log('Purchase Card Report', res);
          this.purchaseInvoiceReport = res.data;

          this.purchaseInvoicesFlattened = this.purchaseInvoiceReport.flatMap(inv =>
            inv.itemDetails.map(item => ({
              invoiceNo: inv.invoiceNo,
              supplierId: inv.supplierID,
              suppilerArabicName: inv.suppilerArabicName,
              suppilerEnglishName: inv.suppilerEnglishName,
              totalItemPrice: inv.totalItemPrice,
              description: inv.description,
              issueDate: inv.issueDate,
              referenceCode: item.referenceCode,
              itemArabicName: item.itemArabicName,
              itemEnglishName: item.itemEnglishName,
              price: item.price,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
              totalPriceWithTax: item.totalPriceWithTax,
              isTaxExempted: item.isTaxExempted 
            }))
          );
          console.log(this.purchaseInvoicesFlattened);

          this.loading = false;

          // Calculate totals properly
          this.purchaseInvoiceReport.forEach(invoice => {
            this.totalPrice += Number(invoice.totalItemPrice) || 0;
            this.totalQuantity += Number(invoice.totalItemQuantity) || 0;
            this.totalInvoicePrice += Number(invoice.totalInvoicePrice) || 0;
            this.totalInvoicePriceWithTax += Number(invoice.totalInvoicePriceWithTax) || 0;
          });

          // Calculate total VAT
          this.totalVAT = this.totalInvoicePriceWithTax - this.totalInvoicePrice;

          this.cdf.detectChanges();

        }
      },
      (error) => {
        console.log('Error Loading Data', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });

        this.loading = false;
      }
    );
  }

  getCompanyDetails() {
    this.companyDetailsService.getAll().subscribe(
      {
        next: (value) => {
          this.companyDetailsModel = value[0];
          console.log(this.companyDetailsModel)
        },
        error(err) {
          console.error('Error loading Company details', err);
        },
      }
    );
  }

  /**
     * Export Purchase Invoice data to Excel by calling the backend API.
     * The backend generates the Excel file as a byte array, which is then saved locally.
     */
  exportToExcel() {
    this.loading = true;
    
    // Check if we have data to export
    if (!this.purchaseInvoiceReport || this.purchaseInvoiceReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('WARNING'),
        detail: 'لا توجد بيانات للتصدير'
      });
      this.loading = false;
      return;
    }
    
    // Create organized Excel data - one row per invoice
    this.exportSimpleExcel();
    
    this.loading = false;
  }

  printPDF() {
    if (!this.startDate || !this.endDate || this.purchaseInvoiceReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchaseInvoiceService.printPurchaseInvoiceReportDocument(startDate, endDate, this.activeLanguage);
  }

  downloadPDF() {
    if (!this.startDate || !this.endDate || this.purchaseInvoiceReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchaseInvoiceService.downloadPurchaseInvoiceReportDocument(startDate, endDate, this.activeLanguage).subscribe({
      next: (blob) => {
        const fileName = `تقرير_القيمة_المضافة_للمشتريات_${startDate}_${endDate}.pdf`;
        this.pdfUtilsService.downloadFile(blob, fileName);
      },
      error: (err) => {
        console.error('Download error', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تنزيل تقرير القيمة المضافة للمشتريات',
        });
      },
    });
  }

  // Share functionality
  openShareDialog() {
    if (!this.startDate || !this.endDate || this.purchaseInvoiceReport.length === 0) {
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
      .sharePurchaseInvoiceReportByEmail(startDate, endDate, email, this.activeLanguage)
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم إرسال تقرير القيمة المضافة للمشتريات عبر البريد الإلكتروني بنجاح.',
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error('Share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال تقرير القيمة المضافة للمشتريات عبر البريد الإلكتروني.',
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
      .sharePurchaseInvoiceReportByWhatsapp(startDate, endDate, phone, this.activeLanguage)
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
            detail: err?.error?.message || 'فشل إرسال تقرير القيمة المضافة للمشتريات عبر واتساب.',
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

  /**
   * Export Purchase Invoice data to Excel with detailed structure
   * Each item gets its own row with invoice details merged based on item count
   */
  exportSimpleExcel() {
    import("xlsx").then(xlsx => {
      const workbook = xlsx.utils.book_new();
      
      // Create worksheet data
      const worksheetData: any[][] = [];
      const merges: any[] = []; // Array to store merge information
      
      // Add date range in one row with 4 merged cells
      const dateRange = `من تاريخ: ${formatDisplayDate(this.startDate)} - إلى تاريخ: ${formatDisplayDate(this.endDate)}`;
      worksheetData.push([dateRange, '', '', '']); // Four cells for merging
      worksheetData.push([]); // Empty row
      
      // Add table headers - with tax exemption column
      const headers = [
        'رقم الفاتورة',
        'اسم المورد', 
        'الوصف',
        'تاريخ الفاتورة',
        'كود الصنف',
        'اسم الصنف',
        'العدد',
        'سعر الوحدة',
        'معفاة من الضريبة',
        'إجمالي الفاتورة',
        'ضريبة القيمة المضافة',
        'الاجمالى شامل الضرائب'
      ];
      worksheetData.push(headers);
      const headerRowIndex = worksheetData.length - 1;
      
      // Add data - each item gets its own row with invoice merges
      this.purchaseInvoiceReport.forEach((invoice) => {
        if (invoice.itemDetails && invoice.itemDetails.length > 0) {
          const itemCount = invoice.itemDetails.length;
          const invoiceStartRow = worksheetData.length;
          
          // Calculate total tax for the invoice
          const totalTax = (invoice.totalInvoicePriceWithTax || 0) - (invoice.totalInvoicePrice || 0);
          
          // Add a row for each item in the invoice
          invoice.itemDetails.forEach((item, itemIndex) => {
            const itemName = this.activeLanguage === 'ar' ? (item.itemArabicName || '') : (item.itemEnglishName || '');
            
            const itemRow = [
              itemIndex === 0 ? (invoice.invoiceNo || '') : '',                // رقم الفاتورة (only first row)
              itemIndex === 0 ? (this.activeLanguage === 'ar' ? 
                (invoice.suppilerArabicName || '') : 
                (invoice.suppilerEnglishName || '')) : '',                     // اسم المورد (only first row)
              itemIndex === 0 ? (invoice.description || '') : '',              // الوصف (only first row)
              itemIndex === 0 ? formatDisplayDate(invoice.issueDate) : '',                                                 // تاريخ الفاتورة (only first row)
              item.referenceCode || '',                                        // كود الصنف (each item)
              itemName,                                                        // اسم الصنف (each item)
              item.quantity || 0,                                              // العدد (each item)
              item.price || 0,                                                 // سعر الوحدة (each item)
              item.isTaxExempted ? 'معفى' : 'غير معفى',                       // معفاة من الضريبة (each item)
              itemIndex === 0 ? (invoice.totalInvoicePrice || 0) : '',        // إجمالي الفاتورة (only first row)
              itemIndex === 0 ? totalTax : '',                                // ضريبة القيمة المضافة (only first row)
              itemIndex === 0 ? (invoice.totalInvoicePriceWithTax || 0) : ''   // الاجمالى شامل الضرائب (only first row)
            ];
            
            worksheetData.push(itemRow);
          });
          
          // Add merge ranges for invoice-level columns (columns 0, 1, 2, 3, 9, 10, 11)
          if (itemCount > 1) {
            const columnsToMerge = [0, 1, 2, 3, 9, 10, 11]; // Invoice-level columns
            columnsToMerge.forEach(col => {
              merges.push({
                s: { r: invoiceStartRow, c: col },           // start row, start column
                e: { r: invoiceStartRow + itemCount - 1, c: col } // end row, end column
              });
            });
          }
        }
      });
      
      // Add total summary row at the end
      worksheetData.push([]); // Empty row before total
      
      // Calculate overall totals
      let totalQuantity = 0;
      let totalInvoiceAmount = 0;
      let totalTaxAmount = 0;
      let totalWithTax = 0;
      let totalInvoicesCount = this.purchaseInvoiceReport.length;
      
      this.purchaseInvoiceReport.forEach(invoice => {
        if (invoice.itemDetails && invoice.itemDetails.length > 0) {
          // Sum quantities from all items
          invoice.itemDetails.forEach(item => {
            totalQuantity += parseFloat(item.quantity || '0');
          });
          
          // Sum invoice totals
          totalInvoiceAmount += invoice.totalInvoicePrice || 0;
          totalWithTax += invoice.totalInvoicePriceWithTax || 0;
        }
      });
      
      totalTaxAmount = totalWithTax - totalInvoiceAmount;
      
      // Add total row
      const totalRow = [
        '',                           // رقم الفاتورة
        '',                           // اسم المورد
        '',                           // الوصف
        'الإجمالي العام',              // تاريخ الفاتورة
        '',                           // كود الصنف
        `${totalInvoicesCount} فاتورة`, // اسم الصنف
        totalQuantity.toFixed(2),     // العدد (إجمالي الكميات)
        '',                           // سعر الوحدة
        '',                           // معفاة من الضريبة
        totalInvoiceAmount.toFixed(2), // إجمالي الفاتورة
        totalTaxAmount.toFixed(2),     // ضريبة القيمة المضافة
        totalWithTax.toFixed(2)        // الاجمالى شامل الضرائب
      ];
      
      worksheetData.push(totalRow);
      const totalRowIndex = worksheetData.length - 1;
      
      // Create worksheet
      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
      
      // Apply merges
      if (merges.length > 0) {
        worksheet['!merges'] = merges;
      }
      
      // Add merge for date range row (first 4 cells)
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({
        s: { r: 0, c: 0 }, // start: first row, first column
        e: { r: 0, c: 3 }  // end: first row, fourth column (4 cells merged)
      });
      
      // Set column widths for better formatting
      const columnWidths = [
        { wch: 12 }, // رقم الفاتورة
        { wch: 15 }, // اسم المورد
        { wch: 15 }, // الوصف
        { wch: 15 }, // تاريخ الفاتورة
        { wch: 12 }, // كود الصنف
        { wch: 25 }, // اسم الصنف
        { wch: 8 },  // العدد
        { wch: 12 }, // سعر الوحدة
        { wch: 15 }, // معفاة من الضريبة
        { wch: 15 }, // إجمالي الفاتورة
        { wch: 18 }, // ضريبة القيمة المضافة
        { wch: 18 }  // الاجمالى شامل الضرائب
      ];
      worksheet['!cols'] = columnWidths;
      
      // Set text direction for RTL support
      if (this.activeLanguage === 'ar') {
        worksheet['!dir'] = 'rtl';
      }
      
      // Style the worksheet - Force center alignment for ALL cells
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Apply center alignment to EVERY single cell in the worksheet
      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
          
          // Create cell if it doesn't exist
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: 's', v: '' };
          }
          
          // Initialize style if it doesn't exist
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          
          // FORCE center alignment on every cell
          worksheet[cellAddress].s.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: false
          };
          
          // Add borders to data cells (skip first row for now)
          if (row >= headerRowIndex) {
            worksheet[cellAddress].s.border = {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            };
          }
        }
      }
      
      // Style date range row (first row) - merged across 4 cells
      const dateRangeCell = xlsx.utils.encode_cell({ r: 0, c: 0 });
      worksheet[dateRangeCell].s = {
        ...worksheet[dateRangeCell].s,
        font: { bold: true, sz: 12 },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      // Style header row with background
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: headerRowIndex, c: col });
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: 'D3D3D3' } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
      
      // Style total row with special formatting
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: totalRowIndex, c: col });
        if (worksheet[cellAddress] && worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {
            ...worksheet[cellAddress].s,
            font: { bold: true, sz: 12 },
            fill: { fgColor: { rgb: 'FFE4B5' } }, // Light orange background
            border: {
              top: { style: 'thick', color: { rgb: '000000' } },
              bottom: { style: 'thick', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }
      
      // Apply number formatting to currency columns
      for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
        // Column 7 (سعر الوحدة) and columns 9-11 (financial columns)
        const currencyColumns = [7, 9, 10, 11];
        currencyColumns.forEach(col => {
          if (col <= range.e.c) {
            const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
            if (worksheet[cellAddress] && worksheet[cellAddress].s) {
              worksheet[cellAddress].s.numFmt = '#,##0.00';
            }
          }
        });
      }
      
      // Set row height
      const rowHeights: any[] = [];
      worksheetData.forEach((row, index) => {
        rowHeights[index] = { hpt: 22 }; // Slightly taller for better center alignment
      });
      worksheet['!rows'] = rowHeights;
      
      // Add worksheet to workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, 'تقرير المشتريات');
      
      // Generate file name with date
      const fileName = `تقرير_المشتريات_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      xlsx.writeFile(workbook, fileName);
      
      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'نجح',
        detail: 'تم تصدير الملف بنجاح'
      });
    }).catch(error => {
      console.error('Error exporting Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'حدث خطأ أثناء تصدير الملف'
      });
      this.loading = false;
    });
  }

  /**
   * Export Purchase Invoice data to Excel directly from the front-end.
   * This generates the Excel file using a predefined table element.
   */
  exportPurchaseInvoiceTableToExcel() {
    const tableHeader: string[] = [
      this.translate.instant('INVOICE.INVOICE_DETAILS'),
      this.translate.instant('INVOICE.ITEMS_DETAILS'),
      this.translate.instant('INVOICE.INVOICENO'),
      this.translate.instant('INVOICE.SUPPLIERNAME'),
      this.translate.instant('INVOICE.DESCRIPTION'),
      this.translate.instant('INVOICE.ISSUE_DATE'),
      this.translate.instant('INVOICE.ITEM_CODE'),
      this.translate.instant('INVOICE.ITEMNAME')
    ];

    // Use the Excel service to generate the Excel file with a custom header
    this.excelService.exportTableToExcelWithHeader(tableHeader, 'purchase_invoice_service', 'purchase_invoice_service')
  }

  exportToPDF() {
    const fileName = this.translate.instant('MENU.PURCHASE_REPORT')
    this.excelService.exportPDF('printSection', fileName);
  }

  print(): void {
    const printContents = document.getElementById('printSection')?.innerHTML;

    if (printContents) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <html>
            <head>
              <title>Print / Save as PDF</title>
              <style>
                /* Add your styles here for proper formatting */
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                h1 { text-align: center; }
              </style>
            </head>
            <body onload="window.print(); window.close();">
              ${printContents}
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  }
}
