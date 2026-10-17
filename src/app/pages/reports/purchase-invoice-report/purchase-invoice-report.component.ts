import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { InvoiceService } from 'src/app/services/invoice/invoice-service.service';
import { formatDateOnlyToString, formatDisplayDate, getSystemNow } from 'src/app/utils/dateUtils';
import { saveAs } from 'file-saver';
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';

@Component({
  selector: 'app-purchase-invoice-report',
  templateUrl: './purchase-invoice-report.component.html',
  styleUrl: './purchase-invoice-report.component.scss',
  standalone: true,
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
    CustomDatePipe
  ],
  providers:[ConfirmationService, MessageService]
})

export class PurchaseInvoiceReportComponent implements OnInit {
  loadingSignal = signal(false);
  startDate;
  endDate;
  totalPrice = 0;
  totalQuantity = 0;
  totalInvoicePrice = 0;
  totalInvoicePriceWithTax = 0;
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

  purchasableInvoiceReportSignal = signal<PurchaseInvoiceDetails[]>([]);
  get purchasableInvoiceReport(): PurchaseInvoiceDetails[] {
    return this.purchasableInvoiceReportSignal()
  }
  set purchasableInvoiceReport(purchasableInvoiceReport: PurchaseInvoiceDetails[]) {
    this.purchasableInvoiceReportSignal.set(purchasableInvoiceReport);
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
    private trailBalanceService: TrailBalanceService,
    private invoiceService: InvoiceService,
    private companyDetailsService: CompanyDetailsService,
    private fb: FormBuilder,
    private pdfUtilsService: PdfUtilsService,
    private activatedRoute: ActivatedRoute

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
    this.getCompanyDetails();
    
    // Read query parameters
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['startDate']) {
        this.startDate = new Date(params['startDate']);
      }
      if (params['endDate']) {
        this.endDate = new Date(params['endDate']);
      }
      // Auto-submit if query parameters are provided
      if (params['startDate'] && params['endDate']) {
        setTimeout(() => {
          this.handleSubmit();
        }, 100);
      }
    });
    
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
    this.loading = true;
    // Reset totals
    this.totalPrice = 0;
    this.totalQuantity = 0;
    this.totalInvoicePrice = 0;
    this.totalInvoicePriceWithTax = 0;
    
    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.invoiceService.GetPurchaseInvoicesDetails(startDate, endDate).subscribe(
      (res: BaseResponse<PurchaseInvoiceDetails[]>) => {
        if (res.errorCode === ResponseStatusCode.Success) {
          console.log('Purchasable Card Report', res);
          this.purchasableInvoiceReport = res.data;

          this.purchasableInvoiceReport.forEach(i => {
            this.totalPrice +=  i.totalItemPrice;
            this.totalQuantity +=  i.totalItemQuantity;
            this.totalInvoicePrice +=  i.totalInvoicePrice;
            this.totalInvoicePriceWithTax +=  i.totalInvoicePriceWithTax;
          })
        }
        this.loading = false;
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

  /**
   * Export Purchase Invoice data to Excel with detailed structure
   * Each item gets its own row with invoice details merged based on item count
   */
  exportToExcel() {
    import("xlsx").then(xlsx => {
      const workbook = xlsx.utils.book_new();
      
      // Create worksheet data
      const worksheetData: any[][] = [];
      const merges: any[] = []; // Array to store merge information
      
      // Add date range in one row with 4 merged cells
      const dateRange = `من تاريخ: ${formatDisplayDate(this.startDate)} - إلى تاريخ: ${formatDisplayDate(this.endDate)}`;
      worksheetData.push([dateRange, '', '', '']); // Four cells for merging
      worksheetData.push([]); // Empty row
      
      // Add table headers
      const headers = [
        'رقم الفاتورة',
        'اسم المورد', 
        'الوصف',
        'تاريخ الفاتورة',
        'كود الصنف',
        'اسم الصنف',
        'العدد',
        'سعر الوحدة',
        'إجمالي الفاتورة',
        'الاجمالى شامل الضرائب'
      ];
      worksheetData.push(headers);
      const headerRowIndex = worksheetData.length - 1;
      
      // Add data - each item gets its own row with invoice merges
      this.purchasableInvoiceReport.forEach((invoice) => {
        if (invoice.itemDetails && invoice.itemDetails.length > 0) {
          const itemCount = invoice.itemDetails.length;
          const invoiceStartRow = worksheetData.length;
          
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
              itemIndex === 0 ? (invoice.totalInvoicePrice || 0) : '',        // إجمالي الفاتورة (only first row)
              itemIndex === 0 ? (invoice.totalInvoicePriceWithTax || 0) : ''   // الاجمالى شامل الضرائب (only first row)
            ];
            
            worksheetData.push(itemRow);
          });
          
          // Add merge ranges for invoice-level columns (columns 0, 1, 2, 3, 8, 9)
          if (itemCount > 1) {
            const columnsToMerge = [0, 1, 2, 3, 8, 9]; // Invoice-level columns
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
      let totalWithTax = 0;
      let totalInvoicesCount = this.purchasableInvoiceReport.length;
      
      this.purchasableInvoiceReport.forEach(invoice => {
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
      
      const totalTaxAmount = totalWithTax - totalInvoiceAmount;
      
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
        totalInvoiceAmount.toFixed(2), // إجمالي الفاتورة
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
        { wch: 15 }, // إجمالي الفاتورة
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
        // Column 7 (سعر الوحدة) and columns 8-9 (financial columns)
        const currencyColumns = [7, 8, 9];
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
    });
  }

  exportToPDF() {
    if (this.purchasableInvoiceReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'لا توجد بيانات لتصديرها'
      });
      return;
    }

    // عرض رسالة جاري التصدير
    const loadingMessage = this.messageService.add({
      severity: 'info',
      summary: 'جاري التصدير',
      detail: 'يرجى الانتظار...',
      life: 0 // لا يختفي تلقائياً
    });

    this.loading = true;
    
    // استخدام setTimeout لتجنب blocking
    setTimeout(() => {
      try {
        // إنشاء HTML للطباعة
        const printContent = this.generatePrintHTML();
        
        // إنشاء عنصر مؤقت لتحويله إلى PDF
        const printElement = document.createElement('div');
        printElement.innerHTML = printContent;
        printElement.style.position = 'absolute';
        printElement.style.left = '-9999px';
        printElement.style.top = '0';
        printElement.style.width = '210mm';
        printElement.style.backgroundColor = '#fff';
        printElement.style.overflow = 'visible';
        document.body.appendChild(printElement);

        // انتظار تحميل الصور قبل البدء
        const images = printElement.querySelectorAll('img');
        const imagePromises: Promise<void>[] = [];
        
        images.forEach((img) => {
          if (!img.complete) {
            const promise = new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve(); // حتى لو فشلت الصورة، نكمل
            });
            imagePromises.push(promise);
          }
        });

        // انتظار تحميل جميع الصور
        Promise.all(imagePromises).then(() => {
          // استخدام setTimeout إضافي لضمان render
          setTimeout(() => {
            // استخدام إعدادات محسّنة لـ html2canvas
            const scale = Math.min(window.devicePixelRatio || 1, 1.5); // تقليل scale
            
            html2canvas(printElement, {
              scale: scale,
              useCORS: true,
              allowTaint: true,
              logging: false,
              backgroundColor: '#ffffff',
              removeContainer: false,
              imageTimeout: 15000,
              width: printElement.scrollWidth,
              height: printElement.scrollHeight,
              windowWidth: printElement.scrollWidth,
              windowHeight: printElement.scrollHeight
            }).then((canvas) => {
              // تحويل canvas إلى JPEG بدلاً من PNG لتقليل الحجم
              const imgData = canvas.toDataURL('image/jpeg', 0.85);
              const pdf = new jsPDF('p', 'mm', 'a4');
              
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = canvas.width;
              const imgHeight = canvas.height;
              
              // حساب الأبعاد مع مراعاة الهوامش
              const margin = 0;
              const contentWidth = pdfWidth - (margin * 2);
              const contentHeight = pdfHeight - (margin * 2);
              
              const ratio = contentWidth / imgWidth;
              const imgScaledWidth = contentWidth;
              const imgScaledHeight = imgHeight * ratio;
              
              // حساب عدد الصفحات المطلوبة
              let heightLeft = imgScaledHeight;
              let position = 0;
              
              // إضافة الصفحة الأولى
              pdf.addImage(imgData, 'JPEG', margin, position, imgScaledWidth, imgScaledHeight);
              heightLeft -= contentHeight;
              
              // إضافة صفحات إضافية إذا لزم الأمر
              while (heightLeft > 0) {
                position = position - contentHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, imgScaledWidth, imgScaledHeight);
                heightLeft -= contentHeight;
              }
              
              // حذف العنصر المؤقت
              if (printElement && printElement.parentNode) {
                document.body.removeChild(printElement);
              }
              
              // حفظ PDF
              const fileName = `تقرير_المشتريات_${new Date().toISOString().split('T')[0]}.pdf`;
              pdf.save(fileName);
              
              this.loading = false;
              this.messageService.clear(); // مسح جميع الرسائل
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم تصدير PDF بنجاح'
              });
            }).catch((error) => {
              console.error('Error exporting PDF:', error);
              if (printElement && printElement.parentNode) {
                document.body.removeChild(printElement);
              }
              this.loading = false;
              this.messageService.clear();
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: 'حدث خطأ أثناء تصدير PDF. يرجى المحاولة مرة أخرى.'
              });
            });
          }, 500); // انتظار 500ms للتأكد من render
        });
      } catch (error) {
        console.error('Error in PDF export:', error);
        this.loading = false;
        this.messageService.clear();
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تصدير PDF. يرجى المحاولة مرة أخرى.'
        });
      }
    }, 100); // تأخير بسيط لتجنب blocking
  }

  printPDF() {
    if (this.purchasableInvoiceReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.invoiceService.printPurchaseInvoiceReportDocument(startDate, endDate, this.activeLanguage);
  }

  generatePrintHTML(): string {
    const direction = this.activeLanguage === 'ar' ? 'rtl' : 'ltr';
    const startDateStr = formatDisplayDate(this.startDate);
    const endDateStr = formatDisplayDate(this.endDate);
    
    // بناء جدول البيانات
    let tableRows = '';
    this.purchasableInvoiceReport.forEach((invoice) => {
      if (invoice.itemDetails && invoice.itemDetails.length > 0) {
        const itemCount = invoice.itemDetails.length;
        const supplierName = this.activeLanguage === 'ar' ? (invoice.suppilerArabicName || '') : (invoice.suppilerEnglishName || '');
        const issueDate = formatDisplayDate(invoice.issueDate);
        
        invoice.itemDetails.forEach((item, itemIndex) => {
          const itemName = this.activeLanguage === 'ar' ? (item.itemArabicName || '') : (item.itemEnglishName || '');
          
          if (itemIndex === 0) {
            // الصف الأول - يحتوي على بيانات الفاتورة مع rowspan
            tableRows += `
              <tr>
                <td rowspan="${itemCount}" style="text-align: center; border: 1px solid #000; padding: 8px; vertical-align: top;">${invoice.invoiceNo || ''}</td>
                <td rowspan="${itemCount}" style="text-align: center; border: 1px solid #000; padding: 8px; vertical-align: top;">${supplierName}</td>
                <td rowspan="${itemCount}" style="text-align: center; border: 1px solid #000; padding: 8px; vertical-align: top;">${invoice.description || ''}</td>
                <td rowspan="${itemCount}" style="text-align: center; border: 1px solid #000; padding: 8px; vertical-align: top;">${issueDate}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${item.referenceCode || ''}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${itemName}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${item.quantity || 0}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${item.price || 0}</td>
                <td rowspan="${itemCount}" style="text-align: center; border: 1px solid #000; padding: 8px; vertical-align: top;">${invoice.totalInvoicePrice || 0}</td>
                <td rowspan="${itemCount}" style="text-align: center; border: 1px solid #000; padding: 8px; vertical-align: top;">${invoice.totalInvoicePriceWithTax || 0}</td>
              </tr>
            `;
          } else {
            // الصفوف التالية - فقط بيانات الصنف
            tableRows += `
              <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${item.referenceCode || ''}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${itemName}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${item.quantity || 0}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${item.price || 0}</td>
              </tr>
            `;
          }
        });
        
        // صف الإجمالي للفاتورة
        tableRows += `
          <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td colspan="4" style="text-align: center; border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.TOTAL')}</td>
            <td colspan="2" style="text-align: center; border: 1px solid #000; padding: 8px;"></td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">${invoice.totalItemQuantity || 0}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">${invoice.totalItemPrice || 0}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">${invoice.totalInvoicePrice || 0}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">${invoice.totalInvoicePriceWithTax || 0}</td>
          </tr>
        `;
      }
    });
    
    // صف الإجمالي العام
    tableRows += `
      <tr style="background-color: #FFE4B5; font-weight: bold; border-top: 2px solid #000;">
        <td colspan="6" style="text-align: center; border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.TOTAL')}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 8px;">${this.totalQuantity.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 8px;">${this.totalPrice.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 8px;">${this.totalInvoicePrice.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 8px;">${this.totalInvoicePriceWithTax.toFixed(2)}</td>
      </tr>
    `;
    
    // بناء HTML كامل
    const html = `
      <!DOCTYPE html>
      <html dir="${direction}">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 10mm;
              direction: ${direction};
            }
            .header {
              width: 100%;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .header-left, .header-right {
              flex: 1;
              text-align: ${this.activeLanguage === 'ar' ? 'right' : 'left'};
            }
            .header-center {
              flex: 0 0 auto;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 0 20px;
            }
            .header-left p, .header-right p {
              margin: 2px 0;
              font-size: 11px;
              font-weight: 600;
            }
            .header-center img {
              max-width: 80px;
              max-height: 80px;
              object-fit: contain;
            }
            .report-title {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              margin: 20px 0;
            }
            .report-info {
              text-align: center;
              margin-bottom: 15px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin-top: 10px;
            }
            th {
              background-color: #D3D3D3;
              font-weight: bold;
              text-align: center;
              border: 1px solid #000;
              padding: 8px;
            }
            td {
              border: 1px solid #000;
              padding: 6px;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${this.companyDetailsModel ? `
            <div class="header">
              <div class="header-content">
                <div class="header-left">
                  <p>${this.companyDetailsModel.arabicName || ''}</p>
                  ${this.companyDetailsModel.city ? `<p>${this.companyDetailsModel.city}</p>` : ''}
                  <p>${this.companyDetailsModel.phone || ''}</p>
                  <p>${this.translate.instant('INVOICE.TAXNUMBER')}: ${this.companyDetailsModel.taxNumber || ''}</p>
                </div>
                <div class="header-center">
                  ${this.companyDetailsModel.logoUrl ? `<img src="${this.companyDetailsModel.logoUrl}" alt="company-logo">` : ''}
                </div>
                <div class="header-right">
                  <p>${this.companyDetailsModel.englishName || ''}</p>
                  ${this.companyDetailsModel.city ? `<p>${this.companyDetailsModel.city}</p>` : ''}
                  <p>${this.companyDetailsModel.phone || ''}</p>
                  <p>TAX No: ${this.companyDetailsModel.taxNumber || ''}</p>
                </div>
              </div>
            </div>
          ` : ''}
          
          <div class="report-title">
            ${this.translate.instant('MENU.PURCHASES')}
          </div>
          
          <div class="report-info">
            ${this.currentUser ? `<p><strong>${this.translate.instant('REPORT.EMPLOYEE')}:</strong> ${this.currentUser.firstName} ${this.currentUser.middleName || ''} ${this.currentUser.lastName}</p>` : ''}
            <p><strong>${this.translate.instant('FINANCE.START_DATE')}:</strong> ${startDateStr} | 
               <strong>${this.translate.instant('FINANCE.END_DATE')}:</strong> ${endDateStr}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th colspan="4" style="text-align: center; border: 1px solid #000; padding: 8px;">
                  ${this.translate.instant('INVOICE.INVOICE_DETAILS')}
                </th>
                <th colspan="6" style="text-align: center; border: 1px solid #000; padding: 8px;">
                  ${this.translate.instant('INVOICE.ITEMS_DETAILS')}
                </th>
              </tr>
              <tr>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.INVOICENO')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.SUPPLIERNAME')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.DESCRIPTION')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.ISSUE_DATE')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.ITEM_CODE')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.ITEMNAME')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('DATA.QUANTITY')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('DATA.UNIT_PRICE')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.TOTAL')}</th>
                <th style="border: 1px solid #000; padding: 8px;">${this.translate.instant('INVOICE.TOTAL_WITH_TAX')}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    return html;
  }

  // Share functionality
  openShareDialog() {
    if (!this.startDate || !this.endDate || this.purchasableInvoiceReport.length === 0) {
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

    this.invoiceService
      .sharePurchaseInvoiceReportByEmail(startDate, endDate, email, this.activeLanguage)
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم إرسال تقرير المشتريات عبر البريد الإلكتروني بنجاح.',
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error('Share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال تقرير المشتريات عبر البريد الإلكتروني.',
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

    this.invoiceService
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
            detail: err?.error?.message || 'فشل إرسال تقرير المشتريات عبر واتساب.',
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

  downloadPDF() {
    if (!this.startDate || !this.endDate || this.purchasableInvoiceReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.invoiceService.downloadPurchaseInvoiceReportDocument(startDate, endDate, this.activeLanguage).subscribe({
      next: (blob) => {
        const fileName = `تقرير_المشتريات_${startDate}_${endDate}.pdf`;
        this.pdfUtilsService.downloadFile(blob, fileName);
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم تنزيل PDF بنجاح'
        });
      },
      error: (err) => {
        console.error('Download PDF error', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تنزيل PDF'
        });
      }
    });
  }

  /**
   * نحاول نثبت مكان الـ dropdown الخاص بالتاريخ تحت الانبوت دائمًا
   */
  onCalendarShow(type: 'start' | 'end'): void {
    setTimeout(() => {
      const panel = document.querySelector('.sales-report-calendar-panel') as HTMLElement | null;
      const input = document.getElementById(type === 'start' ? 'startDate' : 'endDate') as HTMLElement | null;
      if (!panel || !input) {
        return;
      }

      const rect = input.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

      panel.style.position = 'absolute';
      panel.style.top = `${rect.bottom + scrollY + 4}px`;
      panel.style.left = `${rect.left + scrollX}px`;
      panel.style.transform = 'none';
    }, 0);
  }


  /**
   * Helper for manual date typing:
   * - يحول المسافة إلى / عشان يسهل كتابة اليوم/الشهر/السنة
   * - يصحح اليوم والشهر تلقائياً (1–12 للشهر، واليوم حسب الشهر)
   */
  onCalendarInput(event: any, type: 'start' | 'end'): void {
    const inputEl =
      (event?.originalEvent?.target as HTMLInputElement) ||
      (event?.target as HTMLInputElement) ||
      null;
    if (!inputEl) {
      return;
    }

    let original = inputEl.value || '';
    if (!original) {
      return;
    }

    // استبدال المسافات والشرطات بـ /
    let transformed = original.replace(/[ \-]/g, '/');

    // تقسيم التاريخ للأجزاء (يوم/شهر/سنة حسب dd/mm/yy)
    const parts = transformed.split('/').filter(p => p !== '');
    if (parts.length >= 3) {
      let [dayPart, monthPart, yearPart] = parts;

      let monthNum = parseInt(monthPart, 10);
      if (isNaN(monthNum)) monthNum = 1;
      // تصحيح الشهر بين 1 و 12
      monthNum = Math.min(Math.max(monthNum, 1), 12);

      let yearNum = parseInt(yearPart, 10);
      if (isNaN(yearNum) || yearNum <= 0) {
        yearNum = getSystemNow().getFullYear();
      } else if (yearNum < 100) {
        yearNum = 2000 + yearNum;
      }

      // حساب أقصى يوم في هذا الشهر
      const isLeap =
        (yearNum % 4 === 0 && yearNum % 100 !== 0) ||
        yearNum % 400 === 0;
      let maxDay = 31;
      if ([4, 6, 9, 11].includes(monthNum)) {
        maxDay = 30;
      } else if (monthNum === 2) {
        maxDay = isLeap ? 29 : 28;
      }

      let dayNum = parseInt(dayPart, 10);
      if (isNaN(dayNum)) dayNum = 1;
      // تصحيح اليوم بين 1 وأقصى يوم في الشهر
      dayNum = Math.min(Math.max(dayNum, 1), maxDay);

      const pad = (n: number) => n.toString().padStart(2, '0');
      transformed = `${pad(dayNum)}/${pad(monthNum)}/${yearNum}`;
    }

    if (transformed !== original) {
      inputEl.value = transformed;
    }
  }
}
