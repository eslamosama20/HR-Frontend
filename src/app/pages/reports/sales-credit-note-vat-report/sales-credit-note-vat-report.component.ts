import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { SalesCreditNotesService } from 'src/app/services/notes/sales-credit-notes.service';
import { TranslationService } from 'src/app/modules/i18n';
import * as XLSX from 'xlsx';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { FormatDecimalPipe } from 'src/app/pipes/format-decimal.pipe';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ResponseStatusCode } from 'src/app/enums/servers';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { Router } from '@angular/router';
import { getSystemNow } from 'src/app/utils/dateUtils';

interface SalesCreditNoteVATDetails {
  creditNoteId: string;
  creditNoteNo: string;
  customerName: string;
  issueDate: Date;
  itemName: string;
  itemNo: string;
  quantity: number;
  price: number;
  totalBeforeTax: number;
  taxRate: number;
  taxAmount: number;
  totalAfterTax: number;
  discount: number;
  discountAmount: number;
  netPrice: number;
}

@Component({
  selector: 'app-sales-credit-note-vat-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    PanelModule,
    CalendarModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    TabViewModule,
    PrintDocumentComponent,
    FormatDecimalPipe,
    CustomDatePipe,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './sales-credit-note-vat-report.component.html',
  styleUrl: './sales-credit-note-vat-report.component.scss'
})
export class SalesCreditNoteVatReportComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent!: PrintDocumentComponent;

  dateRange: Date[] = [];
  salesCreditNoteVATReport: SalesCreditNoteVATDetails[] = [];
  loading: boolean = false;
  
  // Dialog properties
  shareDialogVisible: boolean = false;
  shareActiveTabIndex: number = 0;
  shareForm!: FormGroup;
  shareBusy: boolean = false;

  // Document properties for printing
  docData: any = [];
  docColumns: any[] = [];
  companyDetails: any = null;

  constructor(
    private salesCreditNoteService: SalesCreditNotesService,
    public translate: TranslateService,
    public translationService: TranslationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private pdfUtilsService: PdfUtilsService,
    private router: Router
  ) {
    const today = getSystemNow();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
    this.dateRange = [firstDayOfYear, lastDayOfYear];

    this.docColumns = [
      { field: 'creditNoteNo', label: 'رقم إشعار الدائن' },
      { field: 'customerName', label: 'اسم العميل' },
      { field: 'issueDate', label: 'التاريخ', pipe: 'date' },
      { field: 'itemNo', label: 'رقم الصنف' },
      { field: 'itemName', label: 'اسم الصنف' },
      { field: 'quantity', label: 'الكمية', pipe: 'number' },
      { field: 'price', label: 'السعر', pipe: 'number' },
      { field: 'totalBeforeTax', label: 'الإجمالي قبل الضريبة', pipe: 'number' },
      { field: 'taxRate', label: 'نسبة الضريبة %', pipe: 'number' },
      { field: 'taxAmount', label: 'قيمة الضريبة', pipe: 'number' },
      { field: 'totalAfterTax', label: 'الإجمالي بعد الضريبة', pipe: 'number' }
    ];
  }

  ngOnInit(): void {
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]]
    });
  }

  handleSubmit(): void {
    if (!this.dateRange || this.dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى اختيار نطاق تاريخ صحيح'
      });
      return;
    }

    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);

    this.loading = true;
    this.salesCreditNoteService.GetSalesCreditNoteVATDetails(startDate, endDate).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.salesCreditNoteVATReport = res.data.map((item: any) => ({
            ...item,
            issueDate: new Date(item.issueDate)
          }));
          
          if (this.salesCreditNoteVATReport.length === 0) {
            this.messageService.add({
              severity: 'info',
              summary: 'لا توجد بيانات',
              detail: 'لا توجد إشعارات دائن في الفترة المحددة'
            });
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching sales credit note VAT report', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل التقرير'
        });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  exportToExcel(): void {
    if (!this.salesCreditNoteVATReport || this.salesCreditNoteVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(this.salesCreditNoteVATReport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SalesCreditNoteVAT');
    XLSX.writeFile(workbook, `Sales_Credit_Note_VAT_Report_${new Date().getTime()}.xlsx`);
  }

  downloadPDF(): void {
    if (!this.salesCreditNoteVATReport || this.salesCreditNoteVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات لتنزيلها'
      });
      return;
    }

    if (!this.dateRange || this.dateRange.length !== 2 || !this.dateRange[0] || !this.dateRange[1]) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى اختيار نطاق تاريخ صحيح'
      });
      return;
    }

    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.salesCreditNoteService.downloadSalesCreditNoteVATReportDocument(startDate, endDate, language).subscribe({
      next: (blob) => {
        const fileName = `تقرير_القيمة_المضافة_لمرتجعات_المبيعات_${startDate}_${endDate}.pdf`;
        this.pdfUtilsService.downloadFile(blob, fileName);
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم تنزيل التقرير بنجاح'
        });
      },
      error: (err) => {
        console.error('Download error', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تنزيل التقرير'
        });
      }
    });
  }

  printPDF(): void {
    if (!this.salesCreditNoteVATReport || this.salesCreditNoteVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للطباعة'
      });
      return;
    }

    window.print();
  }

  prepareDocumentData(): void {
    this.docData = this.salesCreditNoteVATReport;
  }

  openShareDialog(): void {
    if (!this.salesCreditNoteVATReport || this.salesCreditNoteVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    this.shareActiveTabIndex = 0;
    this.shareForm.reset();
    this.shareDialogVisible = true;
  }

  submitShareEmail(): void {
    if (this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: this.translate.instant('GENERAL.PLEASE_ENTER_VALID_EMAIL')
      });
      return;
    }

    if (!this.dateRange || this.dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: 'يرجى اختيار نطاق تاريخ صحيح'
      });
      return;
    }

    const email = this.shareForm.get('email')?.value;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.shareBusy = true;
    this.shareForm.disable();

    this.salesCreditNoteService
      .shareSalesCreditNoteVATReportByEmail(startDate, endDate, email, language)
      .subscribe({
        next: (res: any) => {
          this.shareBusy = false;
          this.shareForm.enable();

          if (res?.isSuccess || res?.IsSuccess) {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('GENERAL.SUCCESS'),
              detail: res?.message || this.translate.instant('GENERAL.EMAIL_SENT_SUCCESSFULLY')
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('GENERAL.ERROR'),
              detail: res?.message || this.translate.instant('GENERAL.FAILED_TO_SEND_EMAIL')
            });
          }
        },
        error: (err) => {
          this.shareBusy = false;
          this.shareForm.enable();
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('GENERAL.ERROR'),
            detail: err?.error?.message || this.translate.instant('GENERAL.FAILED_TO_SEND_EMAIL')
          });
        }
      });
  }

  submitShareWhatsApp(): void {
    if (this.shareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: this.translate.instant('GENERAL.PLEASE_ENTER_VALID_PHONE')
      });
      return;
    }

    if (!this.dateRange || this.dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: 'يرجى اختيار نطاق تاريخ صحيح'
      });
      return;
    }

    const phone = this.shareForm.get('whatsappNumber')?.value;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.shareBusy = true;
    this.shareForm.disable();

    this.salesCreditNoteService
      .shareSalesCreditNoteVATReportByWhatsapp(startDate, endDate, phone, language)
      .subscribe({
        next: (res: any) => {
          this.shareBusy = false;
          this.shareForm.enable();

          if (res?.isSuccess || res?.IsSuccess) {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('GENERAL.SUCCESS'),
              detail: res?.message || this.translate.instant('GENERAL.WHATSAPP_MESSAGE_SENT')
            });

            // Open WhatsApp link if provided
            if (res?.WhatsAppLink || res?.whatsAppLink) {
              const link = res?.WhatsAppLink || res?.whatsAppLink;
              window.open(link, '_blank');
            }

            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('GENERAL.ERROR'),
              detail: res?.message || this.translate.instant('GENERAL.FAILED_TO_SEND_WHATSAPP')
            });
          }
        },
        error: (err) => {
          this.shareBusy = false;
          this.shareForm.enable();
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('GENERAL.ERROR'),
            detail: err?.error?.message || this.translate.instant('GENERAL.FAILED_TO_SEND_WHATSAPP')
          });
        }
      });
  }

  closeShareDialog(): void {
    this.shareDialogVisible = false;
    this.shareForm.reset();
    this.shareBusy = false;
  }

  // Getters for totals
  get totalQuantity(): number {
    return this.salesCreditNoteVATReport.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalBeforeTax(): number {
    return this.salesCreditNoteVATReport.reduce((sum, item) => sum + item.totalBeforeTax, 0);
  }

  get totalTaxAmount(): number {
    return this.salesCreditNoteVATReport.reduce((sum, item) => sum + item.taxAmount, 0);
  }

  get totalAfterTax(): number {
    return this.salesCreditNoteVATReport.reduce((sum, item) => sum + item.totalAfterTax, 0);
  }

  get totalVAT(): number {
    return this.salesCreditNoteVATReport.reduce((sum, item) => sum + item.taxAmount, 0);
  }
}
